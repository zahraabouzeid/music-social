use std::collections::HashMap;

use chrono::{DateTime, Utc};

use super::{ExportError, clean, long_enough};
use crate::listening::Play;

const SONG: &str = "Song Name";
const ARTIST: &str = "Artist Name";
const ALBUM: &str = "Container Album Name";
const STARTED: &str = "Event Start Timestamp";
const PLAYED_MS: &str = "Play Duration Milliseconds";

pub fn looks_like(text: &str) -> bool {
    let header = text.lines().next().unwrap_or_default();
    header.contains(SONG) && header.contains(STARTED)
}

pub fn parse(text: &str) -> Result<Vec<Play>, ExportError> {
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_reader(text.as_bytes());
    let headers: HashMap<String, usize> = reader
        .headers()
        .map_err(|err| ExportError::Malformed(err.to_string()))?
        .iter()
        .enumerate()
        .map(|(index, name)| (name.trim().to_string(), index))
        .collect();
    let column = |name: &str| headers.get(name).copied();
    let (Some(song), Some(started)) = (column(SONG), column(STARTED)) else {
        return Err(ExportError::UnknownFormat);
    };
    let Some(artist) = column(ARTIST) else {
        return Err(ExportError::Malformed(
            "this Apple Music export has no artist column, so songs cannot be matched".into(),
        ));
    };
    let album = column(ALBUM);
    let played_ms = column(PLAYED_MS);

    let mut plays = Vec::new();
    for record in reader.records().flatten() {
        let field = |index: Option<usize>| index.and_then(|i| record.get(i)).map(str::to_string);
        let ms_played = field(played_ms).and_then(|ms| ms.trim().parse::<i64>().ok());
        if !long_enough(ms_played) {
            continue;
        }
        let (Some(title), Some(artist), Some(played_at)) = (
            clean(field(Some(song))),
            clean(field(Some(artist))),
            field(Some(started)).and_then(|ts| DateTime::parse_from_rfc3339(ts.trim()).ok()),
        ) else {
            continue;
        };
        plays.push(Play {
            title,
            artist,
            album: clean(field(album)),
            played_at: played_at.with_timezone(&Utc),
            ms_played: ms_played.and_then(|ms| i32::try_from(ms).ok()),
        });
    }
    Ok(plays)
}

#[cfg(test)]
mod tests {
    use super::{looks_like, parse};

    const SAMPLE: &str = "Artist Name,Container Album Name,Event Start Timestamp,Event Type,Play Duration Milliseconds,Song Name\n\
        Spiritbox,Eternal Blue,2024-03-10T08:15:00.123Z,PLAY_END,198000,Holy Roller\n\
        Spiritbox,Eternal Blue,2024-03-10T08:20:00Z,PLAY_END,9000,Circle With Me\n\
        ,,2024-03-10T08:30:00Z,PLAY_END,200000,\n";

    #[test]
    fn detects_and_reads_play_activity() {
        assert!(looks_like(SAMPLE));
        let plays = parse(SAMPLE).unwrap();
        assert_eq!(plays.len(), 1);
        assert_eq!(plays[0].title, "Holy Roller");
        assert_eq!(plays[0].album.as_deref(), Some("Eternal Blue"));
    }

    #[test]
    fn export_without_artists_is_explained() {
        let text = "Event Start Timestamp,Song Name\n2024-03-10T08:15:00Z,Holy Roller\n";
        let err = parse(text).unwrap_err();
        assert!(err.to_string().contains("no artist column"));
    }
}
