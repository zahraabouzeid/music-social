use std::collections::HashMap;

use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{accounts::User, error::AppResult};

const SHARED_ARTISTS: i64 = 5;

macro_rules! weights {
    () => {
        "with weights as (
            select l.user_id, lower(t.artist) as artist, min(t.artist) as name, ln(1 + count(*)) as weight
            from listens l join tracks t on t.id = l.track_id
            where l.played_at > now() - interval '180 days'
            group by l.user_id, lower(t.artist)
        ),
        norms as (
            select user_id, sqrt(sum(weight * weight)) as norm from weights group by user_id
        )"
    };
}

#[derive(Debug, sqlx::FromRow)]
struct Similarity {
    user_id: Uuid,
    similarity: f64,
}

pub async fn similarities(db: &PgPool, user_id: Uuid, limit: i64) -> AppResult<HashMap<Uuid, f64>> {
    let rows = sqlx::query_as::<_, Similarity>(concat!(
        weights!(),
        "
        select other.user_id, sum(mine.weight * other.weight) / (my_norm.norm * their_norm.norm) as similarity
        from weights mine
        join weights other on other.artist = mine.artist and other.user_id <> mine.user_id
        join norms my_norm on my_norm.user_id = mine.user_id
        join norms their_norm on their_norm.user_id = other.user_id
        where mine.user_id = $1
        group by other.user_id, my_norm.norm, their_norm.norm
        order by similarity desc
        limit $2"
    ))
    .bind(user_id)
    .bind(limit)
    .fetch_all(db)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.user_id, row.similarity))
        .collect())
}

pub async fn shared_artists(db: &PgPool, a: Uuid, b: Uuid) -> AppResult<Vec<String>> {
    Ok(sqlx::query_scalar::<_, String>(concat!(
        weights!(),
        "
        select mine.name
        from weights mine
        join weights other on other.artist = mine.artist
        where mine.user_id = $1 and other.user_id = $2
        order by least(mine.weight, other.weight) desc, mine.weight + other.weight desc, mine.name
        limit $3"
    ))
    .bind(a)
    .bind(b)
    .bind(SHARED_ARTISTS)
    .fetch_all(db)
    .await?)
}

#[derive(Debug, Serialize)]
pub struct Match {
    pub similarity: f64,
    pub shared_artists: Vec<String>,
}

pub async fn match_between(db: &PgPool, viewer: Uuid, other: Uuid) -> AppResult<Match> {
    let similarity: Option<f64> = sqlx::query_scalar(concat!(
        weights!(),
        "
        select sum(mine.weight * other.weight) / (my_norm.norm * their_norm.norm)
        from weights mine
        join weights other on other.artist = mine.artist
        join norms my_norm on my_norm.user_id = mine.user_id
        join norms their_norm on their_norm.user_id = other.user_id
        where mine.user_id = $1 and other.user_id = $2
        group by my_norm.norm, their_norm.norm"
    ))
    .bind(viewer)
    .bind(other)
    .fetch_optional(db)
    .await?
    .flatten();
    Ok(Match {
        similarity: similarity.unwrap_or(0.0),
        shared_artists: shared_artists(db, viewer, other).await?,
    })
}

pub async fn not_followed(db: &PgPool, viewer: Uuid, candidates: &[Uuid]) -> AppResult<Vec<User>> {
    Ok(sqlx::query_as::<_, User>(
        "select * from users
         where id = any($2) and id <> $1
           and not exists (select 1 from follows where follower_id = $1 and followee_id = users.id)",
    )
    .bind(viewer)
    .bind(candidates)
    .fetch_all(db)
    .await?)
}
