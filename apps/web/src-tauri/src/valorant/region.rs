use std::path::PathBuf;

use regex::Regex;

use super::error::AppError;

/// `%LOCALAPPDATA%\VALORANT\Saved\Logs\ShooterGame.log`.
fn log_path() -> Result<PathBuf, AppError> {
    let local = std::env::var("LOCALAPPDATA")
        .map_err(|_| AppError::not_available("LOCALAPPDATA unset (Windows only)"))?;
    Ok(PathBuf::from(local)
        .join("VALORANT")
        .join("Saved")
        .join("Logs")
        .join("ShooterGame.log"))
}

/// Detect (region, shard) by scanning the game log for a glz URL such as
/// `https://glz-eu-1.eu.a.pvp.net`. Returns the most recent match.
///
/// There is no clean local endpoint for this; log parsing is the standard
/// technique. If the log is unavailable, the caller should fall back to a
/// manual region setting (`needRegion`).
pub fn detect_region() -> Result<(String, String), AppError> {
    let path = log_path()?;
    let content = std::fs::read_to_string(&path)
        .map_err(|e| AppError::need_region(format!("game log unreadable ({e})")))?;
    parse_region(&content)
}

fn parse_region(log: &str) -> Result<(String, String), AppError> {
    let re = Regex::new(r"glz-([a-z0-9]+)-1\.([a-z0-9]+)\.a\.pvp\.net")
        .map_err(|e| AppError::parse(e.to_string()))?;
    let caps = re
        .captures_iter(log)
        .last()
        .ok_or_else(|| AppError::need_region("region not found in game log"))?;
    Ok((caps[1].to_string(), caps[2].to_string()))
}

#[cfg(test)]
mod tests {
    use super::parse_region;

    #[test]
    fn extracts_region_and_shard_from_log() {
        let log = "[info] connecting to https://glz-eu-1.eu.a.pvp.net/something\n\
                   [info] later https://glz-na-1.na.a.pvp.net/other";
        let (region, shard) = parse_region(log).unwrap();
        // last match wins
        assert_eq!(region, "na");
        assert_eq!(shard, "na");
    }

    #[test]
    fn errors_when_absent() {
        assert!(parse_region("no glz url here").is_err());
    }
}
