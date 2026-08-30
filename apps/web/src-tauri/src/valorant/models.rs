use serde::{Deserialize, Serialize};
use ts_rs::TS;
//
// `#[ts(export)]` writes each type to `../src/lib/valorant/bindings/` when
// `cargo test` runs. `valorant-bridge.ts` consumes those files, so a renamed
// or removed field here breaks the TypeScript build instead of failing at
// runtime in the webview.

/// Auth context + identity returned by `get_local_tokens` and accepted back as
/// input by `get_current_match`. Mirrors `RiotAuth` + `RiotShard` on the TS side.
///
/// Tokens live in frontend memory only and are never persisted.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
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
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub struct RiotShard {
    pub region: String,
    pub shard: String,
}

/// Lockfile metadata exposed to the frontend.
///
/// The password is intentionally **not** part of this struct — it never leaves
/// the Rust side.
#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub struct LockfileInfo {
    pub name: String,
    pub pid: u32,
    pub port: u16,
    pub protocol: String,
}

/// A player discovered in the current lobby (mirrors `LobbyPlayer` on TS side).
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub struct LobbyPlayer {
    pub puuid: String,
    pub team_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub agent_id: Option<String>,
    pub is_ally: bool,
    pub is_self: bool,
}

/// Result of `get_current_match` (mirrors `CurrentMatch` on TS side).
#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub struct CurrentMatch {
    /// "menus" | "pregame" | "coregame".
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub match_id: Option<String>,
    pub players: Vec<LobbyPlayer>,
    pub shard: RiotShard,
}
