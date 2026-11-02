use std::collections::HashMap;

use chrono::{DateTime, DurationRound, TimeDelta, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use super::{Play, Service, identity_key};
use crate::error::AppResult;

const BATCH_SIZE: usize = 5_000;

pub async fn record_plays(
    db: &PgPool,
    user_id: Uuid,
    service: Service,
    plays: &[Play],
) -> AppResult<u64> {
    let mut added = 0;
    for batch in plays.chunks(BATCH_SIZE) {
        let mut tx = db.begin().await?;
        let track_ids = upsert_tracks(&mut tx, batch).await?;

        let mut track_column = Vec::with_capacity(batch.len());
        let mut played_column = Vec::with_capacity(batch.len());
        let mut ms_column = Vec::with_capacity(batch.len());
        for play in batch {
            track_column.push(track_ids[&identity_key(&play.artist, &play.title)]);
            played_column.push(to_minute(play.played_at));
            ms_column.push(play.ms_played);
        }

        added += sqlx::query(
            "insert into listens (user_id, track_id, played_at, ms_played, service)
             select $1, track_id, played_at, ms_played, $5
             from unnest($2::bigint[], $3::timestamptz[], $4::integer[]) as t(track_id, played_at, ms_played)
             on conflict do nothing",
        )
        .bind(user_id)
        .bind(&track_column)
        .bind(&played_column)
        .bind(&ms_column)
        .bind(service.as_str())
        .execute(&mut *tx)
        .await?
        .rows_affected();
        tx.commit().await?;
    }
    Ok(added)
}

async fn upsert_tracks(
    tx: &mut sqlx::PgConnection,
    plays: &[Play],
) -> AppResult<HashMap<String, i64>> {
    let mut unique: HashMap<String, &Play> = HashMap::new();
    for play in plays {
        unique
            .entry(identity_key(&play.artist, &play.title))
            .or_insert(play);
    }
    let (keys, rest): (Vec<_>, Vec<_>) = unique.into_iter().unzip();
    let titles: Vec<&str> = rest.iter().map(|play| play.title.as_str()).collect();
    let artists: Vec<&str> = rest.iter().map(|play| play.artist.as_str()).collect();
    let albums: Vec<Option<&str>> = rest.iter().map(|play| play.album.as_deref()).collect();

    let rows: Vec<(i64, String)> = sqlx::query_as(
        "insert into tracks (identity_key, title, artist, album)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::text[])
         on conflict (identity_key) do update set album = coalesce(tracks.album, excluded.album)
         returning id, identity_key",
    )
    .bind(&keys)
    .bind(&titles)
    .bind(&artists)
    .bind(&albums)
    .fetch_all(&mut *tx)
    .await?;
    Ok(rows.into_iter().map(|(id, key)| (key, id)).collect())
}

fn to_minute(at: DateTime<Utc>) -> DateTime<Utc> {
    at.duration_trunc(TimeDelta::minutes(1)).unwrap_or(at)
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct RecentPlay {
    pub track_id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub played_at: DateTime<Utc>,
    pub service: String,
}

pub async fn recent(db: &PgPool, user_id: Uuid, limit: i64) -> AppResult<Vec<RecentPlay>> {
    Ok(sqlx::query_as::<_, RecentPlay>(
        "select tracks.id as track_id, tracks.title, tracks.artist, tracks.album, listens.played_at, listens.service
         from listens join tracks on tracks.id = listens.track_id
         where listens.user_id = $1
         order by listens.played_at desc
         limit $2",
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(db)
    .await?)
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ImportRecord {
    pub id: Uuid,
    pub service: String,
    pub plays_found: i32,
    pub plays_added: i32,
    pub created_at: DateTime<Utc>,
}

pub async fn log_import(
    db: &PgPool,
    user_id: Uuid,
    service: Service,
    plays_found: usize,
    plays_added: u64,
) -> AppResult<ImportRecord> {
    Ok(sqlx::query_as::<_, ImportRecord>(
        "insert into imports (user_id, service, plays_found, plays_added)
         values ($1, $2, $3, $4)
         returning id, service, plays_found, plays_added, created_at",
    )
    .bind(user_id)
    .bind(service.as_str())
    .bind(i32::try_from(plays_found).unwrap_or(i32::MAX))
    .bind(i32::try_from(plays_added).unwrap_or(i32::MAX))
    .fetch_one(db)
    .await?)
}

pub async fn imports(db: &PgPool, user_id: Uuid) -> AppResult<Vec<ImportRecord>> {
    Ok(sqlx::query_as::<_, ImportRecord>(
        "select id, service, plays_found, plays_added, created_at
         from imports where user_id = $1 order by created_at desc limit 50",
    )
    .bind(user_id)
    .fetch_all(db)
    .await?)
}
