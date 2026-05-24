use serde::{Deserialize, Serialize};

/// Auth context + identity returned by `get_local_tokens` and accepted back as
/// input by `get_current_match`. Mirrors `RiotAuth` + `RiotShard` on the TS side.
///
/// Tokens live in frontend memory only and are never persisted.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTokens {
    pub access_token: String,
    pub entitlement_token: String,
    /// Game client version, e.g. "release-09.00-shipping-...".
    pub client_version: String,
    pub puuid: String,
    pub region: String,
    pub shard: String,
}

/// Region/shard pair (mirrors `RiotShard` on the TS side).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiotShard {
    pub region: String,
    pub shard: String,
}

/// Lockfile metadata exposed to the frontend.
///
/// The password is intentionally **not** part of this struct — it never leaves
/// the Rust side.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LockfileInfo {
    pub name: String,
    pub pid: u32,
    pub port: u16,
    pub protocol: String,
}

/// A player discovered in the current lobby (mirrors `LobbyPlayer` on TS side).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LobbyPlayer {
    pub puuid: String,
    pub team_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    pub is_ally: bool,
    pub is_self: bool,
}

/// Result of `get_current_match` (mirrors `CurrentMatch` on TS side).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentMatch {
    /// "menus" | "pregame" | "coregame".
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_id: Option<String>,
    pub players: Vec<LobbyPlayer>,
    pub shard: RiotShard,
}
