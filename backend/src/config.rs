use std::net::SocketAddr;

use anyhow::Context;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: SocketAddr,
    pub app_url: String,
    pub public_api_url: String,
    pub lastfm: Option<LastfmConfig>,
    pub spotify: Option<SpotifyConfig>,
}

#[derive(Clone, Debug)]
pub struct LastfmConfig {
    pub api_key: String,
    pub api_url: String,
}

#[derive(Clone, Debug)]
pub struct SpotifyConfig {
    pub client_id: String,
    pub client_secret: String,
    pub accounts_url: String,
    pub api_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let bind_addr = optional("BIND_ADDR")
            .unwrap_or_else(|| "0.0.0.0:8080".into())
            .parse()
            .context("BIND_ADDR is not a valid socket address")?;
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            bind_addr,
            app_url: optional("APP_URL").unwrap_or_else(|| "http://localhost:8081".into()),
            public_api_url: optional("PUBLIC_API_URL")
                .unwrap_or_else(|| "http://localhost:8080".into()),
            lastfm: optional("LASTFM_API_KEY").map(|api_key| LastfmConfig {
                api_key,
                api_url: optional("LASTFM_API_URL")
                    .unwrap_or_else(|| "https://ws.audioscrobbler.com/2.0/".into()),
            }),
            spotify: match (
                optional("SPOTIFY_CLIENT_ID"),
                optional("SPOTIFY_CLIENT_SECRET"),
            ) {
                (Some(client_id), Some(client_secret)) => Some(SpotifyConfig {
                    client_id,
                    client_secret,
                    accounts_url: optional("SPOTIFY_ACCOUNTS_URL")
                        .unwrap_or_else(|| "https://accounts.spotify.com".into()),
                    api_url: optional("SPOTIFY_API_URL")
                        .unwrap_or_else(|| "https://api.spotify.com/v1".into()),
                }),
                _ => None,
            },
        })
    }

    pub fn for_tests() -> Self {
        Self {
            database_url: String::new(),
            bind_addr: "127.0.0.1:0".parse().expect("valid address"),
            app_url: "http://app.test".into(),
            public_api_url: "http://api.test".into(),
            lastfm: None,
            spotify: None,
        }
    }
}

fn required(name: &str) -> anyhow::Result<String> {
    std::env::var(name).with_context(|| format!("{name} is not set"))
}

fn optional(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|value| !value.is_empty())
}
