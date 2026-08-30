use serde::Serialize;
use ts_rs::TS;

/// Error returned by the Valorant Tauri commands.
///
/// Serializes to `{ "kind": "...", "message": "..." }` so the frontend can
/// branch on `kind` (e.g. show the demo/offline state on `notAvailable`,
/// prompt for a region on `needRegion`).
#[derive(Debug, Serialize, TS)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub enum AppError {
    /// Local API unreachable: not Windows, game not running, or lockfile missing.
    NotAvailable { message: String },
    /// Region/shard could not be detected; the user must pick one.
    NeedRegion { message: String },
    /// The player is not currently in a pregame/coregame.
    NotInMatch { message: String },
    /// Authentication with the local API failed.
    Unauthorized { message: String },
    /// Network / HTTP error talking to a Riot endpoint.
    Http { message: String },
    /// Parsing / deserialization error.
    Parse { message: String },
}

impl AppError {
    pub fn not_available(message: impl Into<String>) -> Self {
        Self::NotAvailable {
            message: message.into(),
        }
    }
    pub fn need_region(message: impl Into<String>) -> Self {
        Self::NeedRegion {
            message: message.into(),
        }
    }
    pub fn not_in_match(message: impl Into<String>) -> Self {
        Self::NotInMatch {
            message: message.into(),
        }
    }
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::Unauthorized {
            message: message.into(),
        }
    }
    pub fn http(message: impl Into<String>) -> Self {
        Self::Http {
            message: message.into(),
        }
    }
    pub fn parse(message: impl Into<String>) -> Self {
        Self::Parse {
            message: message.into(),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotAvailable { message }
            | Self::NeedRegion { message }
            | Self::NotInMatch { message }
            | Self::Unauthorized { message }
            | Self::Http { message }
            | Self::Parse { message } => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        Self::http(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        Self::parse(err.to_string())
    }
}
