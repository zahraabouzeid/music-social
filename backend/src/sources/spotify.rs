use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;

use super::SourceError;
use crate::{config::SpotifyConfig, listening::Play};

const SCOPE: &str = "user-read-recently-played";

#[derive(Clone)]
pub struct SpotifyClient {
    http: reqwest::Client,
    config: SpotifyConfig,
    redirect_uri: String,
}

#[derive(Debug, Clone)]
pub struct Tokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
}

#[derive(Deserialize)]
struct RecentlyPlayed {
    items: Vec<Item>,
}

#[derive(Deserialize)]
struct Item {
    track: SpotifyTrack,
    played_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct SpotifyTrack {
    name: String,
    artists: Vec<Named>,
    album: Named,
    duration_ms: i32,
}

#[derive(Deserialize)]
struct Named {
    name: String,
}

#[derive(Deserialize)]
struct Profile {
    id: String,
}

impl SpotifyClient {
    pub fn new(http: reqwest::Client, config: SpotifyConfig, redirect_uri: String) -> Self {
        Self {
            http,
            config,
            redirect_uri,
        }
    }

    pub fn authorize_url(&self, state: &str) -> String {
        let query = [
            ("client_id", self.config.client_id.as_str()),
            ("response_type", "code"),
            ("redirect_uri", self.redirect_uri.as_str()),
            ("scope", SCOPE),
            ("state", state),
        ]
        .iter()
        .map(|(key, value)| format!("{key}={}", urlencode(value)))
        .collect::<Vec<_>>()
        .join("&");
        format!("{}/authorize?{query}", self.config.accounts_url)
    }

    pub async fn exchange_code(&self, code: &str) -> Result<Tokens, SourceError> {
        self.token_request(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", &self.redirect_uri),
        ])
        .await
    }

    pub async fn refresh(&self, refresh_token: &str) -> Result<Tokens, SourceError> {
        let mut tokens = self
            .token_request(&[
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh_token),
            ])
            .await?;
        tokens
            .refresh_token
            .get_or_insert_with(|| refresh_token.to_string());
        Ok(tokens)
    }

    async fn token_request(&self, form: &[(&str, &str)]) -> Result<Tokens, SourceError> {
        let response = self
            .http
            .post(format!("{}/api/token", self.config.accounts_url))
            .basic_auth(&self.config.client_id, Some(&self.config.client_secret))
            .form(form)
            .send()
            .await?;
        if !response.status().is_success() {
            return Err(SourceError::Status(response.status().as_u16()));
        }
        let body: TokenResponse = response.json().await?;
        Ok(Tokens {
            access_token: body.access_token,
            refresh_token: body.refresh_token,
            expires_at: Utc::now() + Duration::seconds(body.expires_in - 60),
        })
    }

    pub async fn account_id(&self, access_token: &str) -> Result<String, SourceError> {
        let response = self
            .http
            .get(format!("{}/me", self.config.api_url))
            .bearer_auth(access_token)
            .send()
            .await?;
        if !response.status().is_success() {
            return Err(SourceError::Status(response.status().as_u16()));
        }
        Ok(response.json::<Profile>().await?.id)
    }

    pub async fn plays_since(
        &self,
        access_token: &str,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<Play>, SourceError> {
        let mut request = self
            .http
            .get(format!("{}/me/player/recently-played", self.config.api_url))
            .bearer_auth(access_token)
            .query(&[("limit", "50")]);
        if let Some(since) = since {
            request = request.query(&[("after", since.timestamp_millis().to_string())]);
        }
        let response = request.send().await?;
        if !response.status().is_success() {
            return Err(SourceError::Status(response.status().as_u16()));
        }
        let body: RecentlyPlayed = response.json().await?;
        Ok(body
            .items
            .into_iter()
            .filter_map(|item| {
                let artist = item.track.artists.into_iter().next()?.name;
                Some(Play {
                    title: item.track.name,
                    artist,
                    album: Some(item.track.album.name),
                    played_at: item.played_at,
                    ms_played: Some(item.track.duration_ms),
                })
            })
            .collect())
    }
}

fn urlencode(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (byte as char).to_string()
            }
            _ => format!("%{byte:02X}"),
        })
        .collect()
}
