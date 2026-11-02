use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::Connection;
use crate::{
    accounts::token,
    error::{AppError, AppResult},
    listening::Service,
    sources::spotify::Tokens,
};

pub async fn list(db: &PgPool, user_id: Uuid) -> AppResult<Vec<Connection>> {
    Ok(sqlx::query_as::<_, Connection>(
        "select * from connections where user_id = $1 order by service",
    )
    .bind(user_id)
    .fetch_all(db)
    .await?)
}

pub async fn find(db: &PgPool, user_id: Uuid, service: Service) -> AppResult<Connection> {
    sqlx::query_as::<_, Connection>("select * from connections where user_id = $1 and service = $2")
        .bind(user_id)
        .bind(service.as_str())
        .fetch_optional(db)
        .await?
        .ok_or(AppError::NotFound("connection"))
}

pub async fn save(
    db: &PgPool,
    user_id: Uuid,
    service: Service,
    external_id: &str,
    tokens: Option<&Tokens>,
) -> AppResult<()> {
    sqlx::query(
        "insert into connections (user_id, service, external_id, access_token, refresh_token, token_expires_at)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id, service) do update set
            external_id = excluded.external_id,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            token_expires_at = excluded.token_expires_at,
            last_error = null",
    )
    .bind(user_id)
    .bind(service.as_str())
    .bind(external_id)
    .bind(tokens.map(|t| t.access_token.as_str()))
    .bind(tokens.and_then(|t| t.refresh_token.as_deref()))
    .bind(tokens.map(|t| t.expires_at))
    .execute(db)
    .await?;
    Ok(())
}

pub async fn delete(db: &PgPool, user_id: Uuid, service: Service) -> AppResult<()> {
    sqlx::query("delete from connections where user_id = $1 and service = $2")
        .bind(user_id)
        .bind(service.as_str())
        .execute(db)
        .await?;
    Ok(())
}

pub async fn store_tokens(
    db: &PgPool,
    user_id: Uuid,
    service: &str,
    tokens: &Tokens,
) -> AppResult<()> {
    sqlx::query(
        "update connections set access_token = $3, refresh_token = $4, token_expires_at = $5
         where user_id = $1 and service = $2",
    )
    .bind(user_id)
    .bind(service)
    .bind(&tokens.access_token)
    .bind(&tokens.refresh_token)
    .bind(tokens.expires_at)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn mark_synced(
    db: &PgPool,
    user_id: Uuid,
    service: &str,
    synced_until: Option<DateTime<Utc>>,
    error: Option<&str>,
) -> AppResult<()> {
    sqlx::query(
        "update connections
         set last_synced_at = now(), synced_until = coalesce($3, synced_until), last_error = $4
         where user_id = $1 and service = $2",
    )
    .bind(user_id)
    .bind(service)
    .bind(synced_until)
    .bind(error)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn due(db: &PgPool, limit: i64) -> AppResult<Vec<Connection>> {
    Ok(sqlx::query_as::<_, Connection>(
        "select * from connections
         where last_synced_at is null or last_synced_at < now() - interval '10 minutes'
         order by last_synced_at nulls first
         limit $1",
    )
    .bind(limit)
    .fetch_all(db)
    .await?)
}

pub async fn create_oauth_state(db: &PgPool, user_id: Uuid) -> AppResult<String> {
    let state = token::generate();
    sqlx::query("insert into oauth_states (state, user_id) values ($1, $2)")
        .bind(&state)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(state)
}

pub async fn take_oauth_state(db: &PgPool, state: &str) -> AppResult<Uuid> {
    sqlx::query_scalar(
        "delete from oauth_states where state = $1 and created_at > now() - interval '15 minutes'
         returning user_id",
    )
    .bind(state)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::BadRequest("this sign-in link has expired, please try again".into()))
}
