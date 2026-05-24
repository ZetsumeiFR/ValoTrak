use serde::de::DeserializeOwned;
use serde::Deserialize;

use super::error::AppError;
use super::http;
use super::models::{CurrentMatch, LobbyPlayer, LocalTokens, RiotShard};

fn glz_base(shard: &RiotShard) -> String {
    format!("https://glz-{}-1.{}.a.pvp.net", shard.region, shard.shard)
}

/// GET a glz endpoint. Returns `Ok(None)` on 404 (player not in that phase),
/// `Err` on any other non-success status.
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
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    if !resp.status().is_success() {
        return Err(AppError::http(format!("{} for {url}", resp.status())));
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
    subject: String,
    #[serde(rename = "TeamID")]
    team_id: String,
    #[serde(rename = "CharacterID")]
    character_id: String,
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
    subject: String,
    #[serde(rename = "CharacterID")]
    character_id: String,
}

fn opt_agent(character_id: String) -> Option<String> {
    if character_id.is_empty() {
        None
    } else {
        Some(character_id)
    }
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
            .find(|p| &p.subject == puuid)
            .map(|p| p.team_id.clone());

        let players = details
            .players
            .into_iter()
            .map(|p| {
                let is_self = &p.subject == puuid;
                let is_ally = self_team.as_ref().is_some_and(|t| t == &p.team_id);
                LobbyPlayer {
                    puuid: p.subject,
                    is_ally,
                    is_self,
                    agent_id: opt_agent(p.character_id),
                    team_id: p.team_id,
                }
            })
            .collect();

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
        let players = details
            .ally_team
            .map(|t| t.players)
            .unwrap_or_default()
            .into_iter()
            .map(|p| LobbyPlayer {
                is_self: &p.subject == puuid,
                puuid: p.subject,
                team_id: team_id.clone(),
                agent_id: opt_agent(p.character_id),
                is_ally: true,
            })
            .collect();

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
