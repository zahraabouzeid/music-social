use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use super::{NowPlaying, Service};
use crate::error::AppResult;

const FRESH_MINUTES: i32 = 10;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Listening {
    pub username: String,
    pub display_name: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub service: String,
    pub updated_at: DateTime<Utc>,
}

pub async fn set(
    db: &PgPool,
    user_id: Uuid,
    service: Service,
    track: &NowPlaying,
) -> AppResult<()> {
    sqlx::query(
        "insert into now_playing (user_id, title, artist, album, service, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (user_id) do update set
            title = excluded.title, artist = excluded.artist, album = excluded.album,
            service = excluded.service, updated_at = now()",
    )
    .bind(user_id)
    .bind(&track.title)
    .bind(&track.artist)
    .bind(&track.album)
    .bind(service.as_str())
    .execute(db)
    .await?;
    Ok(())
}

pub async fn clear(db: &PgPool, user_id: Uuid, service: Service) -> AppResult<()> {
    sqlx::query("delete from now_playing where user_id = $1 and service = $2")
        .bind(user_id)
        .bind(service.as_str())
        .execute(db)
        .await?;
    Ok(())
}

pub async fn for_users(db: &PgPool, users: &[Uuid]) -> AppResult<Vec<Listening>> {
    Ok(sqlx::query_as::<_, Listening>(
        "select u.username, u.display_name, n.title, n.artist, n.album, n.service, n.updated_at
         from now_playing n join users u on u.id = n.user_id
         where n.user_id = any($1) and n.updated_at > now() - make_interval(mins => $2)
         order by n.updated_at desc",
    )
    .bind(users)
    .bind(FRESH_MINUTES)
    .fetch_all(db)
    .await?)
}
