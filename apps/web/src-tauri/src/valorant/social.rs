use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::error::AppError;
use super::{http, lockfile};

/// GET a local Riot Client endpoint, authenticated with the lockfile password.
async fn local_get<T: DeserializeOwned>(path: &str) -> Result<T, AppError> {
    let lf = lockfile::read_lockfile()?;
    let client = http::insecure_client()?;
    let resp = client
        .get(format!("https://127.0.0.1:{}{}", lf.port, path))
        .basic_auth("riot", Some(&lf.password))
        .send()
        .await
        .map_err(|err| {
            // A stale lockfile outlives the client: treat an unreachable port as
            // "not running" rather than a hard failure.
            if err.is_connect() || err.is_timeout() {
                AppError::not_available(format!("Riot Client not reachable ({err})"))
            } else {
                AppError::from(err)
            }
        })?;

    let status = resp.status();
    if !status.is_success() {
        if status.as_u16() == 404 {
            return Err(AppError::not_available(format!(
                "chat API not provisioned yet ({status})"
            )));
        }
        return Err(AppError::unauthorized(format!(
            "local chat returned {status}"
        )));
    }
    Ok(resp.json::<T>().await?)
}

#[derive(Debug, Deserialize)]
struct RawFriends {
    friends: Option<Vec<RawFriend>>,
}

#[derive(Debug, Deserialize)]
struct RawFriend {
    puuid: Option<String>,
    game_name: Option<String>,
    game_tag: Option<String>,
    region: Option<String>,
    note: Option<String>,
}

/// A player on the signed-in user's friend list.
#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub struct Friend {
    pub puuid: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub game_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub tag_line: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub region: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub note: Option<String>,
}

pub async fn get_friends() -> Result<Vec<Friend>, AppError> {
    let raw: RawFriends = local_get("/chat/v4/friends").await?;
    Ok(raw
        .friends
        .unwrap_or_default()
        .into_iter()
        .filter_map(|friend| {
            Some(Friend {
                puuid: friend.puuid?,
                game_name: friend.game_name,
                tag_line: friend.game_tag,
                region: friend.region,
                note: friend.note,
            })
        })
        .collect())
}

#[derive(Debug, Deserialize)]
struct RawPresences {
    presences: Option<Vec<RawPresence>>,
}

#[derive(Debug, Deserialize)]
struct RawPresence {
    puuid: Option<String>,
    game_name: Option<String>,
    game_tag: Option<String>,
    product: Option<String>,
    /// Base64-encoded JSON; only present while the player is in Valorant.
    private: Option<String>,
}

/// The interesting half of the base64 `private` blob.
#[derive(Debug, Deserialize)]
struct RawPrivate {
    #[serde(rename = "sessionLoopState")]
    session_loop_state: Option<String>,
    #[serde(rename = "partySize")]
    party_size: Option<u32>,
    #[serde(rename = "maxPartySize")]
    max_party_size: Option<u32>,
    #[serde(rename = "queueId")]
    queue_id: Option<String>,
    #[serde(rename = "competitiveTier")]
    competitive_tier: Option<u32>,
}

/// A friend currently playing, with what the client publishes about them.
#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../src/lib/valorant/bindings/")]
pub struct FriendPresence {
    pub puuid: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub game_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub tag_line: Option<String>,
    /// "MENUS", "PREGAME" or "INGAME".
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub session_loop_state: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub party_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub max_party_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub queue_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub competitive_tier: Option<u32>,
}

fn decode_private(encoded: &str) -> Option<RawPrivate> {
    let bytes = BASE64.decode(encoded).ok()?;
    serde_json::from_slice::<RawPrivate>(&bytes).ok()
}

/// Presences of friends currently in Valorant.
///
/// Presences from other Riot products, and any whose private blob cannot be
/// decoded, are skipped rather than reported with empty fields.
pub async fn get_presences() -> Result<Vec<FriendPresence>, AppError> {
    let raw: RawPresences = local_get("/chat/v4/presences").await?;
    Ok(raw
        .presences
        .unwrap_or_default()
        .into_iter()
        .filter_map(|presence| {
            let puuid = presence.puuid?;
            let product = presence.product.as_deref().unwrap_or("valorant");
            if product != "valorant" {
                return None;
            }
            let private = presence.private.as_deref().and_then(decode_private)?;
            Some(FriendPresence {
                puuid,
                game_name: presence.game_name,
                tag_line: presence.game_tag,
                session_loop_state: private.session_loop_state,
                party_size: private.party_size,
                max_party_size: private.max_party_size,
                queue_id: private.queue_id,
                competitive_tier: private.competitive_tier,
            })
        })
        .collect())
}
