use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppResult;

const ASSUMED_MS_PER_PLAY: i64 = 210_000;
const TOP_LIMIT: i64 = 10;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Totals {
    pub plays: i64,
    pub minutes: i64,
    pub artists: i64,
    pub tracks: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TopArtist {
    pub name: String,
    pub plays: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TopTrack {
    pub track_id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub plays: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TopAlbum {
    pub name: String,
    pub artist: String,
    pub plays: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DayCount {
    pub day: NaiveDate,
    pub plays: i64,
}

#[derive(Debug, Serialize)]
pub struct Overview {
    pub totals: Totals,
    pub top_artists: Vec<TopArtist>,
    pub top_tracks: Vec<TopTrack>,
    pub top_albums: Vec<TopAlbum>,
    pub daily: Vec<DayCount>,
}

pub async fn overview(db: &PgPool, user_id: Uuid, since: DateTime<Utc>) -> AppResult<Overview> {
    let totals = sqlx::query_as::<_, Totals>(
        "select count(*) as plays,
                coalesce(sum(coalesce(l.ms_played, $3)), 0)::bigint / 60000 as minutes,
                count(distinct lower(t.artist)) as artists,
                count(distinct t.id) as tracks
         from listens l join tracks t on t.id = l.track_id
         where l.user_id = $1 and l.played_at >= $2",
    )
    .bind(user_id)
    .bind(since)
    .bind(ASSUMED_MS_PER_PLAY)
    .fetch_one(db)
    .await?;

    let top_artists = sqlx::query_as::<_, TopArtist>(
        "select min(t.artist) as name, count(*) as plays
         from listens l join tracks t on t.id = l.track_id
         where l.user_id = $1 and l.played_at >= $2
         group by lower(t.artist)
         order by plays desc, name
         limit $3",
    )
    .bind(user_id)
    .bind(since)
    .bind(TOP_LIMIT)
    .fetch_all(db)
    .await?;

    let top_tracks = sqlx::query_as::<_, TopTrack>(
        "select t.id as track_id, t.title, t.artist, t.album, count(*) as plays
         from listens l join tracks t on t.id = l.track_id
         where l.user_id = $1 and l.played_at >= $2
         group by t.id
         order by plays desc, t.title
         limit $3",
    )
    .bind(user_id)
    .bind(since)
    .bind(TOP_LIMIT)
    .fetch_all(db)
    .await?;

    let top_albums = sqlx::query_as::<_, TopAlbum>(
        "select min(t.album) as name, min(t.artist) as artist, count(*) as plays
         from listens l join tracks t on t.id = l.track_id
         where l.user_id = $1 and l.played_at >= $2 and t.album is not null
         group by lower(t.artist), lower(t.album)
         order by plays desc, name
         limit $3",
    )
    .bind(user_id)
    .bind(since)
    .bind(TOP_LIMIT)
    .fetch_all(db)
    .await?;

    let daily = sqlx::query_as::<_, DayCount>(
        "select (l.played_at at time zone 'UTC')::date as day, count(*) as plays
         from listens l
         where l.user_id = $1 and l.played_at >= greatest($2, now() - interval '90 days')
         group by day
         order by day",
    )
    .bind(user_id)
    .bind(since)
    .fetch_all(db)
    .await?;

    Ok(Overview {
        totals,
        top_artists,
        top_tracks,
        top_albums,
        daily,
    })
}
