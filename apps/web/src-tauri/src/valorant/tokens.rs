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

    let resp = client
        .get(format!(
            "https://127.0.0.1:{}/entitlements/v1/token",
            lf.port
        ))
        .basic_auth("riot", Some(&lf.password))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(AppError::unauthorized(format!(
            "local entitlements returned {}",
            resp.status()
        )));
    }

    let body: EntitlementsResponse = resp.json().await?;
    let (region, shard) = region::detect_region().unwrap_or_default();
    let client_version = client_version::fetch_client_version()
        .await
        .unwrap_or_default();

    Ok(LocalTokens {
        access_token: body.access_token,
        entitlement_token: body.token,
        client_version,
        puuid: body.subject,
        region,
        shard,
    })
}
