use serde::Deserialize;
use serde::de::DeserializeOwned;

use super::error::AppError;
use super::http;
use super::models::{CurrentMatch, LobbyPlayer, LocalTokens, RiotShard};

fn glz_base(shard: &RiotShard) -> String {
    format!("https://glz-{}-1.{}.a.pvp.net", shard.region, shard.shard)
}

/// GET a glz endpoint. Returns `Ok(None)` on 404 (player not in that phase),
/// `Err` on any other non-success status. 401/403 surface as `Unauthorized` so
/// the UI can prompt for re-auth instead of showing a generic transport error.
async fn glz_get<T: DeserializeOwned>(
    client: &reqwest::Client,
    tokens: &LocalTokens,
    url: &str,
) -> Result<Option<T>, AppError> {
    let resp = client
        .get(url)
        .headers(http::auth_headers(tokens)?)
        .send()
        .await?;
    let status = resp.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    if !status.is_success() {
        let msg = format!("{status} for {url}");
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(AppError::unauthorized(msg));
        }
        return Err(AppError::http(msg));
    }
    Ok(Some(resp.json::<T>().await?))
}

/* ------------------------------ Coregame ------------------------------ */

#[derive(Deserialize)]
struct CoreGamePlayerRef {
    #[serde(rename = "MatchID")]
    match_id: String,
}

#[derive(Deserialize)]
struct CoreGameMatch {
    #[serde(rename = "Players")]
    players: Vec<CoreGamePlayer>,
}

#[derive(Deserialize)]
struct CoreGamePlayer {
    #[serde(rename = "Subject")]
    subject: Option<String>,
    #[serde(rename = "TeamID")]
    team_id: Option<String>,
    #[serde(rename = "CharacterID")]
    character_id: Option<String>,
}

/* ------------------------------ Pregame ------------------------------- */

#[derive(Deserialize)]
struct PregamePlayerRef {
    #[serde(rename = "MatchID")]
    match_id: String,
}

#[derive(Deserialize)]
struct PregameMatch {
    #[serde(rename = "AllyTeam")]
    ally_team: Option<PregameTeam>,
}

#[derive(Deserialize)]
struct PregameTeam {
    #[serde(rename = "TeamID")]
    team_id: String,
    #[serde(rename = "Players")]
    players: Vec<PregamePlayer>,
}

#[derive(Deserialize)]
struct PregamePlayer {
    #[serde(rename = "Subject")]
    subject: Option<String>,
    #[serde(rename = "CharacterID")]
    character_id: Option<String>,
}

fn opt_agent(character_id: Option<String>) -> Option<String> {
    character_id.filter(|id| !id.is_empty())
}

/// Detect the current phase and the players present.
///
/// Tries coregame first (the player may be loading in while pregame is still
/// queryable), then pregame, otherwise reports `menus`. In pregame the API only
/// exposes the player's own team, so all returned players are allies.
pub async fn get_current_match(tokens: &LocalTokens) -> Result<CurrentMatch, AppError> {
    if tokens.region.is_empty() || tokens.shard.is_empty() {
        return Err(AppError::need_region("region/shard not set"));
    }
    let shard = RiotShard {
        region: tokens.region.clone(),
        shard: tokens.shard.clone(),
    };
    let base = glz_base(&shard);
    let client = http::client()?;
    let puuid = &tokens.puuid;

    // Coregame
    if let Some(player_ref) = glz_get::<CoreGamePlayerRef>(
        &client,
        tokens,
        &format!("{base}/core-game/v1/players/{puuid}"),
    )
    .await?
    {
        let match_id = player_ref.match_id;
        let details: CoreGameMatch = glz_get(
            &client,
            tokens,
            &format!("{base}/core-game/v1/matches/{match_id}"),
        )
        .await?
        .ok_or_else(|| AppError::not_in_match("coregame match vanished"))?;

        let self_team = details
            .players
            .iter()
            .find(|p| p.subject.as_deref() == Some(puuid))
            .and_then(|p| p.team_id.clone());

        let players: Vec<LobbyPlayer> = details
            .players
            .into_iter()
            .filter_map(|p| {
                let subject = p.subject?;
                let team_id = p.team_id.unwrap_or_default();
                let is_self = subject == *puuid;
                let is_ally = self_team.as_ref().is_some_and(|t| t == &team_id);
                Some(LobbyPlayer {
                    puuid: subject,
                    is_ally,
                    is_self,
                    agent_id: opt_agent(p.character_id),
                    team_id,
                })
            })
            .collect();
        if players.is_empty() {
            return Err(AppError::parse("coregame match contains no valid players"));
        }

        return Ok(CurrentMatch {
            phase: "coregame".to_string(),
            match_id: Some(match_id),
            players,
            shard,
        });
    }

    // Pregame
    if let Some(player_ref) = glz_get::<PregamePlayerRef>(
        &client,
        tokens,
        &format!("{base}/pregame/v1/players/{puuid}"),
    )
    .await?
    {
        let match_id = player_ref.match_id;
        let details: PregameMatch = glz_get(
            &client,
            tokens,
            &format!("{base}/pregame/v1/matches/{match_id}"),
        )
        .await?
        .ok_or_else(|| AppError::not_in_match("pregame match vanished"))?;

        let team_id = details
            .ally_team
            .as_ref()
            .map(|t| t.team_id.clone())
            .unwrap_or_default();
        let players: Vec<LobbyPlayer> = details
            .ally_team
            .map(|t| t.players)
            .unwrap_or_default()
            .into_iter()
            .filter_map(|p| {
                let subject = p.subject?;
                Some(LobbyPlayer {
                    is_self: subject == *puuid,
                    puuid: subject,
                    team_id: team_id.clone(),
                    agent_id: opt_agent(p.character_id),
                    is_ally: true,
                })
            })
            .collect();
        if players.is_empty() {
            return Err(AppError::parse("pregame match contains no valid players"));
        }

        return Ok(CurrentMatch {
            phase: "pregame".to_string(),
            match_id: Some(match_id),
            players,
            shard,
        });
    }

    Ok(CurrentMatch {
        phase: "menus".to_string(),
        match_id: None,
        players: Vec::new(),
        shard,
    })
}
