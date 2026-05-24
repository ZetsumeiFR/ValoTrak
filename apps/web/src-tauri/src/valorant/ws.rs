use std::time::Duration;

use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::Connector;

use super::error::AppError;
use super::lockfile;

/// Tauri event emitted to the frontend whenever the local client signals a
/// lobby/presence change. The frontend debounces this and refetches the match.
pub const LOBBY_CHANGED_EVENT: &str = "valorant://lobby-changed";

/// Subscribe to the messaging-service stream, which fires on pregame/coregame
/// transitions (and other presence updates).
const SUBSCRIBE: &str = r#"[5, "OnJsonApiEvent_riot-messaging-service_v1_message"]"#;

/// Long-running task: connect to the local websocket and re-emit lobby changes.
///
/// Reconnects on disconnect. When the local API is unavailable (e.g. not on
/// Windows, or the game isn't running) it backs off and retries — so this is a
/// no-op on the macOS dev machine rather than an error.
pub async fn run_listener(app: AppHandle) {
    loop {
        let backoff = match connect_and_listen(&app).await {
            Ok(()) => Duration::from_secs(5),
            Err(AppError::NotAvailable { .. }) => Duration::from_secs(30),
            Err(err) => {
                log::warn!("valorant ws listener error: {err}");
                Duration::from_secs(15)
            }
        };
        tokio::time::sleep(backoff).await;
    }
}

async fn connect_and_listen(app: &AppHandle) -> Result<(), AppError> {
    let lf = lockfile::read_lockfile()?;

    let mut request = format!("wss://127.0.0.1:{}/", lf.port)
        .into_client_request()
        .map_err(|e| AppError::http(e.to_string()))?;
    let basic = base64::engine::general_purpose::STANDARD.encode(format!("riot:{}", lf.password));
    request.headers_mut().insert(
        AUTHORIZATION,
        format!("Basic {basic}")
            .parse()
            .map_err(|_| AppError::parse("invalid auth header"))?,
    );

    let tls = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
        .map_err(|e| AppError::http(e.to_string()))?;

    let (mut ws, _) = tokio_tungstenite::connect_async_tls_with_config(
        request,
        None,
        false,
        Some(Connector::NativeTls(tls)),
    )
    .await
    .map_err(|e| AppError::http(e.to_string()))?;

    ws.send(Message::Text(SUBSCRIBE.into()))
        .await
        .map_err(|e| AppError::http(e.to_string()))?;
    log::info!("valorant ws listener connected");

    while let Some(msg) = ws.next().await {
        let msg = msg.map_err(|e| AppError::http(e.to_string()))?;
        if msg.is_text() {
            // We don't parse the payload; any messaging-service event is a cheap
            // signal for the frontend to refetch the current match (debounced).
            let _ = app.emit(LOBBY_CHANGED_EVENT, ());
        }
    }

    Ok(())
}
