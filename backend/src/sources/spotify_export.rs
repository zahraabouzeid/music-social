use chrono::{DateTime, NaiveDateTime, Utc};
use serde::Deserialize;
use serde_json::Value;

use super::{ExportError, clean, long_enough};
use crate::listening::Play;

#[derive(Deserialize)]
struct ExtendedEntry {
    ts: String,
    ms_played: Option<i64>,
    master_metadata_track_name: Option<String>,
    master_metadata_album_artist_name: Option<String>,
    master_metadata_album_album_name: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountEntry {
    end_time: String,
    artist_name: Option<String>,
    track_name: Option<String>,
    ms_played: Option<i64>,
}

pub fn parse(text: &str) -> Result<Vec<Play>, ExportError> {
    let entries: Vec<Value> =
        serde_json::from_str(text).map_err(|err| ExportError::Malformed(err.to_string()))?;
    let Some(first) = entries.first() else {
        return Ok(Vec::new());
    };

    if first.get("ts").is_some() {
        Ok(entries.into_iter().filter_map(extended_play).collect())
    } else if first.get("endTime").is_some() {
        Ok(entries.into_iter().filter_map(account_play).collect())
    } else {
        Err(ExportError::UnknownFormat)
    }
}

fn extended_play(value: Value) -> Option<Play> {
    let entry: ExtendedEntry = serde_json::from_value(value).ok()?;
    if !long_enough(entry.ms_played) {
        return None;
    }
    Some(Play {
        title: clean(entry.master_metadata_track_name)?,
        artist: clean(entry.master_metadata_album_artist_name)?,
        album: clean(entry.master_metadata_album_album_name),
        played_at: DateTime::parse_from_rfc3339(&entry.ts)
            .ok()?
            .with_timezone(&Utc),
        ms_played: entry.ms_played.and_then(|ms| i32::try_from(ms).ok()),
    })
}

fn account_play(value: Value) -> Option<Play> {
    let entry: AccountEntry = serde_json::from_value(value).ok()?;
    if !long_enough(entry.ms_played) {
        return None;
    }
    Some(Play {
        title: clean(entry.track_name)?,
        artist: clean(entry.artist_name)?,
        album: None,
        played_at: NaiveDateTime::parse_from_str(&entry.end_time, "%Y-%m-%d %H:%M")
            .ok()?
            .and_utc(),
        ms_played: entry.ms_played.and_then(|ms| i32::try_from(ms).ok()),
    })
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn reads_extended_history_and_skips_podcasts_and_skips() {
        let text = r#"[
            {"ts": "2024-05-01T18:30:12Z", "ms_played": 241000,
             "master_metadata_track_name": "Alkaline", "master_metadata_album_artist_name": "Sleep Token",
             "master_metadata_album_album_name": "Take Me Back To Eden"},
            {"ts": "2024-05-01T18:31:00Z", "ms_played": 4000,
             "master_metadata_track_name": "Skipped", "master_metadata_album_artist_name": "Someone",
             "master_metadata_album_album_name": null},
            {"ts": "2024-05-01T19:00:00Z", "ms_played": 1800000,
             "master_metadata_track_name": null, "master_metadata_album_artist_name": null,
             "episode_name": "A podcast"}
        ]"#;
        let plays = parse(text).unwrap();
        assert_eq!(plays.len(), 1);
        assert_eq!(plays[0].artist, "Sleep Token");
        assert_eq!(plays[0].album.as_deref(), Some("Take Me Back To Eden"));
        assert_eq!(plays[0].played_at.to_rfc3339(), "2024-05-01T18:30:12+00:00");
    }

    #[test]
    fn reads_account_data_history() {
        let text = r#"[{"endTime": "2024-01-02 21:05", "artistName": "Ghost", "trackName": "Mary On A Cross", "msPlayed": 245000}]"#;
        let plays = parse(text).unwrap();
        assert_eq!(plays.len(), 1);
        assert_eq!(plays[0].title, "Mary On A Cross");
        assert_eq!(plays[0].played_at.to_rfc3339(), "2024-01-02T21:05:00+00:00");
    }
}
