use regex::Regex;
use serde::Deserialize;

use super::error::AppError;
use super::{http, region};

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
    let resp = client
        .get("https://valorant-api.com/v1/version")
        .send()
        .await?;
    if !resp.status().is_success() {
        return Err(AppError::http(format!(
            "valorant-api.com version returned {}",
            resp.status()
        )));
    }
    let envelope: VersionEnvelope = resp.json().await?;
    Ok(envelope.data.riot_client_version)
}

/// Extract the running client version from the game log's
/// `CI server version: release-XX.YY-shipping-N-NNNNNNN` line (most recent wins).
fn parse_ci_version(log: &str) -> Option<String> {
    let re = Regex::new(r"CI server version:\s*(\S+)").ok()?;
    re.captures_iter(log)
        .last()
        .map(|caps| caps[1].to_string())
}

/// The running client's exact version, read from the local game log. `None` when
/// the game has never run on this machine (no log).
fn version_from_log() -> Option<String> {
    let path = region::log_path().ok()?;
    let content = std::fs::read_to_string(path).ok()?;
    parse_ci_version(&content)
}

/// Best value for the `X-Riot-ClientVersion` header.
///
/// Prefers the running client's exact version from the local game log — this is
/// always correct. Falls back to valorant-api.com only when the log isn't
/// available (remote login, or the game never ran here). valorant-api.com lags a
/// patch behind on patch/hotfix day, which makes pvp.net reject the request with
/// a `400`, so the log is the authoritative source whenever it exists.
///
/// Returns an error rather than an empty string when both sources fail, so
/// callers don't silently send `X-Riot-ClientVersion:` and get opaque pvp.net
/// failures downstream.
pub async fn resolve() -> Result<String, AppError> {
    if let Some(version) = version_from_log() {
        return Ok(version);
    }
    fetch_client_version().await
}

#[cfg(test)]
mod tests {
    use super::parse_ci_version;

    #[test]
    fn extracts_ci_server_version_last_wins() {
        let log = "\
[2026.05.25-19.46.14:596][  0]LogShooter: Display: CI server version: release-12.09-shipping-25-4697179
[2026.05.25-19.46.14:596][  0]LogShooter: Display: CI server version: release-12.09-shipping-26-4704114";
        assert_eq!(
            parse_ci_version(log).as_deref(),
            Some("release-12.09-shipping-26-4704114"),
        );
    }

    #[test]
    fn none_when_absent() {
        assert!(parse_ci_version("no version line here").is_none());
    }
}
