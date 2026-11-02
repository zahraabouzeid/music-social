use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::SourceError;
use crate::{
    config::LastfmConfig,
    listening::{NowPlaying, Play},
};

const PAGE_SIZE: u32 = 200;
const MAX_PAGES: u32 = 50;

#[derive(Clone)]
pub struct LastfmClient {
    http: reqwest::Client,
    config: LastfmConfig,
}

#[derive(Deserialize)]
struct RecentTracksResponse {
    recenttracks: RecentTracks,
}

#[derive(Deserialize)]
struct RecentTracks {
    #[serde(default)]
    track: Vec<Track>,
    #[serde(rename = "@attr")]
    attr: PageAttr,
}

#[derive(Deserialize)]
struct PageAttr {
    #[serde(rename = "totalPages")]
    total_pages: String,
}

#[derive(Deserialize)]
struct Track {
    name: String,
    artist: Text,
    album: Option<Text>,
    date: Option<Date>,
    #[serde(rename = "@attr")]
    attr: Option<TrackAttr>,
}

#[derive(Deserialize)]
struct TrackAttr {
    nowplaying: Option<String>,
}

#[derive(Deserialize)]
struct Text {
    #[serde(rename = "#text")]
    text: String,
}

#[derive(Deserialize)]
struct Date {
    uts: String,
}

impl LastfmClient {
    pub fn new(http: reqwest::Client, config: LastfmConfig) -> Self {
        Self { http, config }
    }

    pub async fn user_exists(&self, username: &str) -> Result<bool, SourceError> {
        let response = self
            .http
            .get(&self.config.api_url)
            .query(&[
                ("method", "user.getinfo"),
                ("user", username),
                ("api_key", &self.config.api_key),
                ("format", "json"),
            ])
            .send()
            .await?;
        match response.status().as_u16() {
            200 => Ok(true),
            404 => Ok(false),
            status => Err(SourceError::Status(status)),
        }
    }

    pub async fn now_playing(&self, username: &str) -> Result<Option<NowPlaying>, SourceError> {
        let response = self
            .http
            .get(&self.config.api_url)
            .query(&[
                ("method", "user.getrecenttracks"),
                ("user", username),
                ("api_key", &self.config.api_key),
                ("format", "json"),
                ("limit", "1"),
            ])
            .send()
            .await?;
        if !response.status().is_success() {
            return Err(SourceError::Status(response.status().as_u16()));
        }
        let body: RecentTracksResponse = response.json().await?;
        Ok(body
            .recenttracks
            .track
            .into_iter()
            .find(|track| {
                track
                    .attr
                    .as_ref()
                    .and_then(|attr| attr.nowplaying.as_deref())
                    == Some("true")
            })
            .map(|track| NowPlaying {
                title: track.name,
                artist: track.artist.text,
                album: track
                    .album
                    .map(|album| album.text)
                    .filter(|album| !album.is_empty()),
            }))
    }

    pub async fn plays_since(
        &self,
        username: &str,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<Play>, SourceError> {
        let from = since
            .map(|at| (at.timestamp() + 1).to_string())
            .unwrap_or_else(|| "0".into());
        let mut plays = Vec::new();
        let mut page = 1;
        loop {
            let response = self
                .http
                .get(&self.config.api_url)
                .query(&[
                    ("method", "user.getrecenttracks"),
                    ("user", username),
                    ("api_key", &self.config.api_key),
                    ("format", "json"),
                    ("from", &from),
                    ("limit", &PAGE_SIZE.to_string()),
                    ("page", &page.to_string()),
                ])
                .send()
                .await?;
            if !response.status().is_success() {
                return Err(SourceError::Status(response.status().as_u16()));
            }
            let body: RecentTracksResponse = response.json().await?;
            plays.extend(body.recenttracks.track.into_iter().filter_map(to_play));
            let total_pages: u32 = body.recenttracks.attr.total_pages.parse().unwrap_or(1);
            if page >= total_pages || page >= MAX_PAGES {
                return Ok(plays);
            }
            page += 1;
        }
    }
}

fn to_play(track: Track) -> Option<Play> {
    let played_at = DateTime::from_timestamp(track.date?.uts.parse().ok()?, 0)?;
    Some(Play {
        title: track.name,
        artist: track.artist.text,
        album: track
            .album
            .map(|album| album.text)
            .filter(|album| !album.is_empty()),
        played_at,
        ms_played: None,
    })
}
