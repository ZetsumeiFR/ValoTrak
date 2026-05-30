//! Remote Riot login via the official hosted OAuth page (no running game needed).
//!
//! We open Riot's real `authorize` page in a dedicated WebView window and let the
//! user sign in there — Riot handles Cloudflare, hCaptcha and 2FA itself. On
//! success Riot redirects to `playvalorant.com/opt_in#access_token=...`; we
//! intercept that navigation, pull the tokens out of the URL fragment, then
//! derive the entitlements token, puuid and region/shard exactly like the local
//! client path. The result is a {@link LocalTokens}, so every downstream
//! consumer (profile, storefront, …) is unchanged.
//!
//! The login window uses a dedicated WebView data directory so the Riot session
//! cookie (`ssid`) persists for silent re-auth across restarts, and so logout
//! can clear it without touching the main window's localStorage.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use base64::Engine;
use serde::Deserialize;
use serde_json::json;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

use super::error::AppError;
use super::models::LocalTokens;
use super::{client_version, http};

/// Hosted OAuth authorize URL for the VALORANT web client (implicit flow:
/// `response_type=token id_token`). Tokens come back in the redirect fragment.
const AUTHORIZE_URL: &str = "https://auth.riotgames.com/authorize\
?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in\
&client_id=play-valorant-web-prod\
&response_type=token%20id_token\
&nonce=1\
&scope=account%20openid";

/// Riot redirects here with the tokens in the URL fragment once auth succeeds.
const REDIRECT_PREFIX: &str = "https://playvalorant.com/opt_in";
const LOGIN_WINDOW_LABEL: &str = "riot-login";
const LOGOUT_WINDOW_LABEL: &str = "riot-logout";

/// How long to wait for a visible interactive login (user may need 2FA/email).
const LOGIN_TIMEOUT: Duration = Duration::from_secs(300);
/// How long to wait for a hidden cookie-based re-auth before giving up.
const REAUTH_TIMEOUT: Duration = Duration::from_secs(20);
const ALLOWED_LOGIN_HOSTS: &[&str] = &["riotgames.com", "playvalorant.com"];

struct CapturedTokens {
    access_token: String,
    id_token: String,
}

/// Pull `access_token` and `id_token` out of the `#a=b&c=d` redirect fragment.
fn parse_token_fragment(fragment: &str) -> Option<CapturedTokens> {
    let mut access_token = None;
    let mut id_token = None;
    for pair in fragment.split('&') {
        if let Some((key, value)) = pair.split_once('=') {
            match key {
                "access_token" => access_token = Some(value.to_string()),
                "id_token" => id_token = Some(value.to_string()),
                _ => {}
            }
        }
    }
    Some(CapturedTokens {
        access_token: access_token?,
        id_token: id_token?,
    })
}

fn is_allowed_login_navigation(url: &Url) -> bool {
    if url.scheme() != "https" {
        return false;
    }
    let Some(host) = url.host_str() else {
        return false;
    };
    ALLOWED_LOGIN_HOSTS
        .iter()
        .any(|allowed| host == *allowed || host.ends_with(&format!(".{allowed}")))
}

/// Dedicated WebView data dir for the Riot session (cookies live here).
fn riot_session_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| AppError::not_available(format!("no app data dir: {e}")))?;
    Ok(base.join("riot-session"))
}

/// Drive the hosted login page in a WebView window and capture the redirect
/// tokens. `visible=false` performs a silent cookie-based re-auth.
async fn run_login(
    app: &AppHandle,
    visible: bool,
    timeout: Duration,
) -> Result<CapturedTokens, AppError> {
    // Drop any stale login window from a previous attempt.
    if let Some(existing) = app.get_webview_window(LOGIN_WINDOW_LABEL) {
        let _ = existing.close();
    }

    let url = Url::parse(AUTHORIZE_URL).map_err(|e| AppError::parse(e.to_string()))?;
    let data_dir = riot_session_dir(app)?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| AppError::parse(format!("create session dir: {e}")))?;

    let (tx, rx) = tokio::sync::oneshot::channel::<CapturedTokens>();
    let tx = Arc::new(Mutex::new(Some(tx)));
    let tx_nav = tx.clone();

    let window = WebviewWindowBuilder::new(app, LOGIN_WINDOW_LABEL, WebviewUrl::External(url))
        .title("Connexion Riot")
        .inner_size(460.0, 720.0)
        .visible(visible)
        .focused(visible)
        .data_directory(data_dir)
        .on_navigation(move |target| {
            if target.as_str().starts_with(REDIRECT_PREFIX)
                && let Some(fragment) = target.fragment()
                && let Some(tokens) = parse_token_fragment(fragment)
            {
                if let Ok(mut guard) = tx_nav.lock()
                    && let Some(sender) = guard.take()
                {
                    let _ = sender.send(tokens);
                }
                // Cancel the navigation so we never actually load the
                // external redirect target.
                return false;
            }
            is_allowed_login_navigation(target)
        })
        .build()
        .map_err(|e| AppError::http(format!("login window: {e}")))?;

    let outcome = tokio::time::timeout(timeout, rx).await;
    let _ = window.close();

    match outcome {
        Ok(Ok(tokens)) => Ok(tokens),
        Ok(Err(_)) => Err(AppError::unauthorized("login window closed before sign-in")),
        Err(_) => Err(AppError::not_available(
            "login timed out (not signed in)".to_string(),
        )),
    }
}

/// Exchange the captured OAuth tokens for the full auth context.
async fn build_tokens(captured: CapturedTokens) -> Result<LocalTokens, AppError> {
    let entitlement_token = fetch_entitlement(&captured.access_token).await?;
    let puuid = puuid_from_jwt(&captured.access_token)?;
    let (region, shard) = fetch_region(&captured.access_token, &captured.id_token).await?;
    let client_version = client_version::resolve().await?;

    Ok(LocalTokens {
        access_token: captured.access_token,
        entitlement_token,
        client_version,
        puuid,
        region,
        shard,
    })
}

/// `POST entitlements.auth.riotgames.com/api/token/v1` -> entitlements JWT.
async fn fetch_entitlement(access_token: &str) -> Result<String, AppError> {
    #[derive(Deserialize)]
    struct Resp {
        entitlements_token: String,
    }
    let client = http::client()?;
    let resp = client
        .post("https://entitlements.auth.riotgames.com/api/token/v1")
        .bearer_auth(access_token)
        .json(&json!({}))
        .send()
        .await?;
    let status = resp.status();
    if !status.is_success() {
        let msg = format!("entitlements returned {status}");
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(AppError::unauthorized(msg));
        }
        return Err(AppError::http(msg));
    }
    Ok(resp.json::<Resp>().await?.entitlements_token)
}

/// Decode the unverified JWT payload and read the `sub` claim (the puuid).
///
/// We trust the token because we just received it from Riot over TLS; no
/// signature check is needed (and we don't have the key anyway).
fn puuid_from_jwt(jwt: &str) -> Result<String, AppError> {
    let payload = jwt
        .split('.')
        .nth(1)
        .ok_or_else(|| AppError::parse("malformed access token"))?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|e| AppError::parse(format!("token payload decode: {e}")))?;
    #[derive(Deserialize)]
    struct Claims {
        sub: String,
    }
    Ok(serde_json::from_slice::<Claims>(&bytes)?.sub)
}

/// `PUT riot-geo.pas.si.riotgames.com/.../valorant` -> live region; derive shard.
async fn fetch_region(access_token: &str, id_token: &str) -> Result<(String, String), AppError> {
    #[derive(Deserialize)]
    struct Affinities {
        live: String,
    }
    #[derive(Deserialize)]
    struct Resp {
        affinities: Affinities,
    }
    let client = http::client()?;
    let resp = client
        .put("https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant")
        .bearer_auth(access_token)
        .json(&json!({ "id_token": id_token }))
        .send()
        .await?;
    let status = resp.status();
    if !status.is_success() {
        let msg = format!("geo returned {status}");
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(AppError::unauthorized(msg));
        }
        return Err(AppError::http(msg));
    }
    let payload = resp.json::<Resp>().await?;
    if payload.affinities.live.is_empty() {
        return Err(AppError::need_region("geo returned no live region"));
    }
    let region = payload.affinities.live;
    let shard = region_to_shard(&region).to_string();
    Ok((region, shard))
}

/// Map a live region to its pd/glz shard. Most regions share the name; the two
/// Latin-American regions are served by the `na` shard.
fn region_to_shard(region: &str) -> &str {
    match region {
        "latam" | "br" => "na",
        other => other,
    }
}

/// Interactive login: show the Riot page and wait for the user to sign in.
pub async fn login(app: AppHandle) -> Result<LocalTokens, AppError> {
    let captured = run_login(&app, true, LOGIN_TIMEOUT).await?;
    build_tokens(captured).await
}

/// Silent re-auth using the persisted session cookie (no UI). Returns
/// `notAvailable` when there is no valid session to resume.
pub async fn silent_reauth(app: AppHandle) -> Result<LocalTokens, AppError> {
    let captured = run_login(&app, false, REAUTH_TIMEOUT).await?;
    build_tokens(captured).await
}

/// Forget the persisted Riot session so silent re-auth no longer succeeds.
///
/// Clears the dedicated WebView store (cookies + storage) rather than the main
/// window's, so app settings in localStorage are preserved.
pub async fn logout(app: AppHandle) -> Result<(), AppError> {
    if let Some(existing) = app.get_webview_window(LOGIN_WINDOW_LABEL) {
        let _ = existing.close();
    }
    if let Some(existing) = app.get_webview_window(LOGOUT_WINDOW_LABEL) {
        let _ = existing.close();
    }

    let data_dir = riot_session_dir(&app)?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| AppError::parse(format!("create session dir: {e}")))?;
    let blank = Url::parse("about:blank").map_err(|e| AppError::parse(e.to_string()))?;
    let window = WebviewWindowBuilder::new(&app, LOGOUT_WINDOW_LABEL, WebviewUrl::External(blank))
        .visible(false)
        .data_directory(data_dir)
        .build()
        .map_err(|e| AppError::http(format!("logout window: {e}")))?;

    let result = window
        .clear_all_browsing_data()
        .map_err(|e| AppError::http(format!("clear session: {e}")));
    let _ = window.close();
    result
}

#[cfg(test)]
mod tests {
    use super::{is_allowed_login_navigation, parse_token_fragment, region_to_shard};
    use tauri::Url;

    #[test]
    fn parses_access_and_id_tokens_from_fragment() {
        let frag = "access_token=eyAAA.bbb.ccc&scope=openid&id_token=eyDDD.eee.fff\
                    &token_type=Bearer&expires_in=3600";
        let tokens = parse_token_fragment(frag).unwrap();
        assert_eq!(tokens.access_token, "eyAAA.bbb.ccc");
        assert_eq!(tokens.id_token, "eyDDD.eee.fff");
    }

    #[test]
    fn fragment_without_access_token_is_none() {
        assert!(parse_token_fragment("error=access_denied").is_none());
    }

    #[test]
    fn latam_and_br_use_na_shard() {
        assert_eq!(region_to_shard("latam"), "na");
        assert_eq!(region_to_shard("br"), "na");
        assert_eq!(region_to_shard("eu"), "eu");
        assert_eq!(region_to_shard("ap"), "ap");
    }

    #[test]
    fn allows_only_riot_login_navigation_hosts() {
        let riot = Url::parse("https://auth.riotgames.com/authorize").unwrap();
        let valorant = Url::parse("https://playvalorant.com/opt_in").unwrap();
        let attacker = Url::parse("https://riotgames.com.example.com/phish").unwrap();
        let insecure = Url::parse("http://auth.riotgames.com/authorize").unwrap();

        assert!(is_allowed_login_navigation(&riot));
        assert!(is_allowed_login_navigation(&valorant));
        assert!(!is_allowed_login_navigation(&attacker));
        assert!(!is_allowed_login_navigation(&insecure));
    }
}
