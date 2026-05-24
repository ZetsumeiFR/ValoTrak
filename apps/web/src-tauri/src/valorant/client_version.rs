use serde::Deserialize;

use super::error::AppError;
use super::http;

#[derive(Deserialize)]
struct VersionEnvelope {
    data: VersionData,
}

#[derive(Deserialize)]
struct VersionData {
    #[serde(rename = "riotClientVersion")]
    riot_client_version: String,
}

/// Fetch the current game client version string from valorant-api.com.
///
/// `riotClientVersion` (e.g. "release-09.00-shipping-...") is the value the
/// pvp.net endpoints expect in the `X-Riot-ClientVersion` header.
pub async fn fetch_client_version() -> Result<String, AppError> {
    let client = http::client()?;
    let envelope: VersionEnvelope = client
        .get("https://valorant-api.com/v1/version")
        .send()
        .await?
        .json()
        .await?;
    Ok(envelope.data.riot_client_version)
}
