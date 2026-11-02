use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppResult;

const ASSUMED_MS_PER_PLAY: i64 = 210_000;
const BOARD_SIZE: i64 = 50;

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Scope {
    #[default]
    Following,
    Global,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Entry {
    pub rank: i64,
    pub username: String,
    pub display_name: String,
    pub plays: i64,
    pub minutes: i64,
}

pub async fn listeners(
    db: &PgPool,
    viewer: Uuid,
    scope: Scope,
    since: DateTime<Utc>,
    artist: Option<&str>,
) -> AppResult<Vec<Entry>> {
    Ok(sqlx::query_as::<_, Entry>(
        "select rank() over (order by sum(coalesce(l.ms_played, $4)) desc) as rank,
                u.username, u.display_name,
                count(*) as plays,
                sum(coalesce(l.ms_played, $4))::bigint / 60000 as minutes
         from listens l
         join users u on u.id = l.user_id
         join tracks t on t.id = l.track_id
         where l.played_at >= $3
           and ($5::text is null or lower(t.artist) = lower($5))
           and ($2 = 'global'
                or l.user_id = $1
                or l.user_id in (select followee_id from follows where follower_id = $1))
         group by u.id
         order by rank, u.username
         limit $6",
    )
    .bind(viewer)
    .bind(match scope {
        Scope::Following => "following",
        Scope::Global => "global",
    })
    .bind(since)
    .bind(ASSUMED_MS_PER_PLAY)
    .bind(artist)
    .bind(BOARD_SIZE)
    .fetch_all(db)
    .await?)
}
