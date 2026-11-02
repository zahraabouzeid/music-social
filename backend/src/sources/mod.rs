mod apple_export;
pub mod lastfm;
pub mod spotify;
mod spotify_export;

use crate::listening::{Play, Service};

const MIN_MS_PLAYED: i64 = 30_000;

#[derive(Debug)]
pub struct ParsedExport {
    pub service: Service,
    pub plays: Vec<Play>,
}

#[derive(Debug, thiserror::Error)]
pub enum ExportError {
    #[error("this file is not a supported listening history export")]
    UnknownFormat,
    #[error("the file could not be read: {0}")]
    Malformed(String),
}

pub fn parse_export(bytes: &[u8]) -> Result<ParsedExport, ExportError> {
    let text = std::str::from_utf8(bytes)
        .map_err(|_| ExportError::Malformed("not UTF-8 text".into()))?
        .trim_start_matches('\u{feff}')
        .trim_start();

    if text.starts_with('[') {
        let plays = spotify_export::parse(text)?;
        return Ok(ParsedExport {
            service: Service::Spotify,
            plays,
        });
    }
    if apple_export::looks_like(text) {
        let plays = apple_export::parse(text)?;
        return Ok(ParsedExport {
            service: Service::AppleMusic,
            plays,
        });
    }
    Err(ExportError::UnknownFormat)
}

#[derive(Debug, thiserror::Error)]
pub enum SourceError {
    #[error("the service answered with status {0}")]
    Status(u16),
    #[error("the service could not be reached: {0}")]
    Network(#[from] reqwest::Error),
}

fn long_enough(ms_played: Option<i64>) -> bool {
    ms_played.is_none_or(|ms| ms >= MIN_MS_PLAYED)
}

fn clean(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

#[derive(Clone, Default)]
pub struct Sources {
    pub lastfm: Option<lastfm::LastfmClient>,
    pub spotify: Option<spotify::SpotifyClient>,
}

impl Sources {
    pub fn from_config(config: &crate::config::Config) -> Self {
        let http = reqwest::Client::builder()
            .user_agent("music-social/0.1")
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .expect("http client builds with static settings");
        Self {
            lastfm: config
                .lastfm
                .clone()
                .map(|lastfm| lastfm::LastfmClient::new(http.clone(), lastfm)),
            spotify: config.spotify.clone().map(|spotify| {
                let redirect_uri =
                    format!("{}/api/connections/spotify/callback", config.public_api_url);
                spotify::SpotifyClient::new(http.clone(), spotify, redirect_uri)
            }),
        }
    }

    pub fn available(&self) -> Vec<Service> {
        [
            self.lastfm.as_ref().map(|_| Service::Lastfm),
            self.spotify.as_ref().map(|_| Service::Spotify),
        ]
        .into_iter()
        .flatten()
        .collect()
    }
}
