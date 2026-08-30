mod valorant;

use valorant::error::AppError;
use valorant::models::{CurrentMatch, LocalTokens, LockfileInfo, RiotShard};
use valorant::social::{Friend, FriendPresence};

/// Read the Riot Client lockfile metadata (password excluded).
#[tauri::command]
async fn read_lockfile() -> Result<LockfileInfo, AppError> {
    let lf = valorant::lockfile::read_lockfile()?;
    Ok(LockfileInfo {
        name: lf.name,
        pid: lf.pid,
        port: lf.port,
        protocol: lf.protocol,
    })
}

/// Obtain the access/entitlement tokens, puuid, region/shard and client version.
#[tauri::command]
async fn get_local_tokens() -> Result<LocalTokens, AppError> {
    valorant::tokens::get_local_tokens().await
}

/// Detect the current pregame/coregame lobby (phase + players).
#[tauri::command]
async fn get_current_match(tokens: LocalTokens) -> Result<CurrentMatch, AppError> {
    valorant::match_state::get_current_match(&tokens).await
}

/// Detect region/shard from the game log.
#[tauri::command]
async fn detect_region() -> Result<RiotShard, AppError> {
    let (region, shard) = valorant::region::detect_region()?;
    Ok(RiotShard { region, shard })
}

/// Interactive remote login via Riot's hosted page (no running game needed).
#[tauri::command]
async fn riot_login(app: tauri::AppHandle) -> Result<LocalTokens, AppError> {
    valorant::auth::login(app).await
}

/// Silent re-auth from the persisted session cookie; `notAvailable` if none.
#[tauri::command]
async fn riot_silent_reauth(app: tauri::AppHandle) -> Result<LocalTokens, AppError> {
    valorant::auth::silent_reauth(app).await
}

/// List the signed-in player's friends (local chat API).
#[tauri::command]
async fn get_friends() -> Result<Vec<Friend>, AppError> {
    valorant::social::get_friends().await
}

/// Presences of friends currently in Valorant (local chat API).
#[tauri::command]
async fn get_presences() -> Result<Vec<FriendPresence>, AppError> {
    valorant::social::get_presences().await
}

/// Forget the persisted Riot session (logout).
#[tauri::command]
async fn riot_logout(app: tauri::AppHandle) -> Result<(), AppError> {
    valorant::auth::logout(app).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Desktop auto-updater (signed releases checked against GitHub).
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Auto-detect entering pregame/coregame via the local websocket.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(valorant::ws::run_listener(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_lockfile,
            get_local_tokens,
            get_current_match,
            detect_region,
            riot_login,
            riot_silent_reauth,
            riot_logout,
            get_friends,
            get_presences
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|err| {
            log::error!("tauri application terminated with error: {err}");
        });
}
