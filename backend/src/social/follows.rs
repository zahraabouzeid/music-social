use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    accounts::{PublicUser, User},
    error::{AppError, AppResult},
};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Counts {
    pub followers: i64,
    pub following: i64,
    pub plays: i64,
}

pub async fn follow(db: &PgPool, follower: Uuid, followee: Uuid) -> AppResult<()> {
    if follower == followee {
        return Err(AppError::BadRequest("you cannot follow yourself".into()));
    }
    sqlx::query(
        "insert into follows (follower_id, followee_id) values ($1, $2) on conflict do nothing",
    )
    .bind(follower)
    .bind(followee)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn unfollow(db: &PgPool, follower: Uuid, followee: Uuid) -> AppResult<()> {
    sqlx::query("delete from follows where follower_id = $1 and followee_id = $2")
        .bind(follower)
        .bind(followee)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn is_following(db: &PgPool, follower: Uuid, followee: Uuid) -> AppResult<bool> {
    Ok(sqlx::query_scalar(
        "select exists(select 1 from follows where follower_id = $1 and followee_id = $2)",
    )
    .bind(follower)
    .bind(followee)
    .fetch_one(db)
    .await?)
}

pub async fn counts(db: &PgPool, user_id: Uuid) -> AppResult<Counts> {
    Ok(sqlx::query_as::<_, Counts>(
        "select
            (select count(*) from follows where followee_id = $1) as followers,
            (select count(*) from follows where follower_id = $1) as following,
            (select count(*) from listens where user_id = $1) as plays",
    )
    .bind(user_id)
    .fetch_one(db)
    .await?)
}

pub async fn followers(db: &PgPool, user_id: Uuid) -> AppResult<Vec<PublicUser>> {
    let users = sqlx::query_as::<_, User>(
        "select users.* from follows join users on users.id = follows.follower_id
         where follows.followee_id = $1 order by follows.created_at desc limit 200",
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;
    Ok(users.iter().map(Into::into).collect())
}

pub async fn following(db: &PgPool, user_id: Uuid) -> AppResult<Vec<PublicUser>> {
    let users = sqlx::query_as::<_, User>(
        "select users.* from follows join users on users.id = follows.followee_id
         where follows.follower_id = $1 order by follows.created_at desc limit 200",
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;
    Ok(users.iter().map(Into::into).collect())
}

pub async fn search(db: &PgPool, query: &str) -> AppResult<Vec<PublicUser>> {
    let pattern = format!("%{}%", query.trim().replace(['%', '_'], ""));
    let users = sqlx::query_as::<_, User>(
        "select * from users
         where username ilike $1 or display_name ilike $1
         order by username limit 20",
    )
    .bind(pattern)
    .fetch_all(db)
    .await?;
    Ok(users.iter().map(Into::into).collect())
}
