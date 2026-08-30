use std::time::Duration;

use reqwest::header::{AUTHORIZATION, HeaderMap, HeaderName, HeaderValue};

use super::error::AppError;
use super::models::LocalTokens;

/// Well-known `X-Riot-ClientPlatform` blob (same value as the TS constant).
pub const CLIENT_PLATFORM: &str = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

/// HTTP client that accepts the self-signed cert of the local API (127.0.0.1).
pub fn insecure_client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(AppError::from)
}

/// HTTP client with normal TLS validation (glz/pd/valorant-api have valid certs).
pub fn client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(AppError::from)
}

/// Headers required by the authenticated pvp.net endpoints.
pub fn auth_headers(tokens: &LocalTokens) -> Result<HeaderMap, AppError> {
    let mut headers = HeaderMap::new();
    let bearer = HeaderValue::from_str(&format!("Bearer {}", tokens.access_token))
        .map_err(|e| AppError::parse(e.to_string()))?;
    headers.insert(AUTHORIZATION, bearer);
    headers.insert(
        HeaderName::from_static("x-riot-entitlements-jwt"),
        HeaderValue::from_str(&tokens.entitlement_token)
            .map_err(|e| AppError::parse(e.to_string()))?,
    );
    headers.insert(
        HeaderName::from_static("x-riot-clientversion"),
        HeaderValue::from_str(&tokens.client_version)
            .map_err(|e| AppError::parse(e.to_string()))?,
    );
    headers.insert(
        HeaderName::from_static("x-riot-clientplatform"),
        HeaderValue::from_static(CLIENT_PLATFORM),
    );
    Ok(headers)
}
