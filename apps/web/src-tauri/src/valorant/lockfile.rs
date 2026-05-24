use std::path::PathBuf;

use super::error::AppError;

/// Parsed Riot Client lockfile. `password` stays internal to Rust.
pub struct Lockfile {
    pub name: String,
    pub pid: u32,
    pub port: u16,
    pub password: String,
    pub protocol: String,
}

/// `%LOCALAPPDATA%\Riot Games\Riot Client\Config\lockfile` (Windows only).
pub fn lockfile_path() -> Result<PathBuf, AppError> {
    let local = std::env::var("LOCALAPPDATA").map_err(|_| {
        AppError::not_available("LOCALAPPDATA unset (Valorant runs on Windows only)")
    })?;
    Ok(PathBuf::from(local)
        .join("Riot Games")
        .join("Riot Client")
        .join("Config")
        .join("lockfile"))
}

pub fn read_lockfile() -> Result<Lockfile, AppError> {
    let path = lockfile_path()?;
    let content = std::fs::read_to_string(&path).map_err(|e| {
        AppError::not_available(format!("lockfile unreadable ({e}); is Valorant running?"))
    })?;
    parse_lockfile(content.trim())
}

/// Parse the `name:pid:port:password:protocol` lockfile format.
pub fn parse_lockfile(content: &str) -> Result<Lockfile, AppError> {
    let parts: Vec<&str> = content.split(':').collect();
    if parts.len() != 5 {
        return Err(AppError::parse(format!(
            "unexpected lockfile format ({} fields)",
            parts.len()
        )));
    }
    Ok(Lockfile {
        name: parts[0].to_string(),
        pid: parts[1]
            .parse()
            .map_err(|_| AppError::parse("invalid pid"))?,
        port: parts[2]
            .parse()
            .map_err(|_| AppError::parse("invalid port"))?,
        password: parts[3].to_string(),
        protocol: parts[4].to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::parse_lockfile;

    #[test]
    fn parses_standard_lockfile() {
        let lf = parse_lockfile("Riot Client:12345:54321:abcdEFGH:https").unwrap();
        assert_eq!(lf.name, "Riot Client");
        assert_eq!(lf.pid, 12345);
        assert_eq!(lf.port, 54321);
        assert_eq!(lf.password, "abcdEFGH");
        assert_eq!(lf.protocol, "https");
    }

    #[test]
    fn rejects_malformed_lockfile() {
        assert!(parse_lockfile("too:few:fields").is_err());
    }
}
