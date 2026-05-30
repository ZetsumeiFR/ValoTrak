use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio::time::{Duration, Instant};
use tokio_tungstenite::Connector;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;

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

    const IDLE_TIMEOUT: Duration = Duration::from_secs(60);
    const EMIT_THROTTLE: Duration = Duration::from_millis(1000);
    let mut last_emit = Instant::now() - EMIT_THROTTLE;

    loop {
        match tokio::time::timeout(IDLE_TIMEOUT, ws.next()).await {
            Err(_) => {
                log::warn!("valorant ws idle for {IDLE_TIMEOUT:?}, reconnecting");
                return Ok(());
            }
            Ok(None) => return Ok(()),
            Ok(Some(msg)) => {
                let msg = msg.map_err(|e| AppError::http(e.to_string()))?;
                match msg {
                    Message::Text(_) => {
                        let now = Instant::now();
                        if now.duration_since(last_emit) >= EMIT_THROTTLE {
                            last_emit = now;
                            if let Err(err) = app.emit(LOBBY_CHANGED_EVENT, ()) {
                                log::warn!("emit {LOBBY_CHANGED_EVENT} failed: {err}");
                            }
                        }
                    }
                    Message::Ping(payload) => {
                        if let Err(err) = ws.send(Message::Pong(payload)).await {
                            return Err(AppError::http(format!("pong send: {err}")));
                        }
                    }
                    Message::Close(_) => return Ok(()),
                    _ => {}
                }
            }
        }
    }
}
