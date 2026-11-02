use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Service {
    Spotify,
    AppleMusic,
    Lastfm,
    Deezer,
}

impl Service {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Spotify => "spotify",
            Self::AppleMusic => "apple_music",
            Self::Lastfm => "lastfm",
            Self::Deezer => "deezer",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Play {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub played_at: DateTime<Utc>,
    pub ms_played: Option<i32>,
}
