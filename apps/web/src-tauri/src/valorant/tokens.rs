use serde::Deserialize;

use super::error::AppError;
use super::models::LocalTokens;
use super::{client_version, http, lockfile, region};

#[derive(Deserialize)]
struct EntitlementsResponse {
    #[serde(rename = "accessToken")]
    access_token: String,
    /// Entitlements JWT.
    token: String,
    /// PUUID.
    subject: String,
}

/// Read the local tokens (access token, entitlement, puuid) from the running
/// client, plus best-effort region/shard and the client version.
///
/// Region/shard are left empty when the game log isn't available; the frontend
/// then supplies them from the user's region setting.
pub async fn get_local_tokens() -> Result<LocalTokens, AppError> {
    let lf = lockfile::read_lockfile()?;
    let client = http::insecure_client()?;

    let resp = match client
        .get(format!(
            "https://127.0.0.1:{}/entitlements/v1/token",
            lf.port
        ))
        .basic_auth("riot", Some(&lf.password))
        .send()
        .await
    {
        Ok(resp) => resp,
        // A stale lockfile can survive after the Riot Client exits: the file is
        // still readable but nothing listens on its port, so the request can't
        // be sent. Treat that as "not running" (demo/remote-login fallback)
        // rather than a hard error, same as a missing lockfile.
        Err(err) if err.is_connect() || err.is_timeout() => {
            return Err(AppError::not_available(format!(
                "Riot Client not reachable ({err}); is it running?"
            )));
        }
        Err(err) => return Err(AppError::from(err)),
    };

    let status = resp.status();
    if !status.is_success() {
        // The Riot Client is reachable but the entitlements token isn't
        // provisioned yet — the normal state when VALORANT itself isn't
        // running/logged in (this endpoint 404s until a game session exists).
        // Report it as "not available" so the UI falls back to the demo/offline
        // state instead of surfacing a raw error.
        if status.as_u16() == 404 {
            return Err(AppError::not_available(format!(
                "Valorant isn't running yet (entitlements {status})"
            )));
        }
        return Err(AppError::unauthorized(format!(
            "local entitlements returned {status}"
        )));
    }

    let body: EntitlementsResponse = resp.json().await?;
    let (region, shard) = region::detect_region().unwrap_or_default();
    let client_version = client_version::resolve().await;

    Ok(LocalTokens {
        access_token: body.access_token,
        entitlement_token: body.token,
        client_version,
        puuid: body.subject,
        region,
        shard,
    })
}
