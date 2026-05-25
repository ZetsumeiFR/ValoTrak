//! Valorant integration: reads the local Riot Client API (self-signed cert) and
//! the authenticated pvp.net game endpoints to discover the current lobby.
//!
//! All networking that needs the self-signed local cert lives here in Rust;
//! per-player enrichment (mmr, match history, names) is done in TS via the
//! Rust-backed `@tauri-apps/plugin-http` transport.

pub mod auth;
pub mod client_version;
pub mod error;
pub mod http;
pub mod lockfile;
pub mod match_state;
pub mod models;
pub mod region;
pub mod tokens;
pub mod ws;
