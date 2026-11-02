use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::{User, token};
use crate::error::{AppError, AppResult};

const SESSION_LIFETIME_DAYS: i64 = 60;

pub struct NewUser {
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub password_hash: String,
}

pub async fn create(db: &PgPool, new: NewUser) -> AppResult<User> {
    sqlx::query_as::<_, User>(
        "insert into users (username, display_name, email, password_hash)
         values ($1, $2, $3, $4)
         returning *",
    )
    .bind(&new.username)
    .bind(&new.display_name)
    .bind(&new.email)
    .bind(&new.password_hash)
    .fetch_one(db)
    .await
    .map_err(|err| match &err {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            match db_err.constraint() {
                Some("users_email_key") => AppError::Conflict("email is already registered".into()),
                _ => AppError::Conflict("username is taken".into()),
            }
        }
        _ => err.into(),
    })
}

pub async fn find_by_login(db: &PgPool, login: &str) -> AppResult<Option<User>> {
    Ok(sqlx::query_as::<_, User>(
        "select * from users where username = lower($1) or lower(email) = lower($1)",
    )
    .bind(login.trim())
    .fetch_optional(db)
    .await?)
}

pub async fn find_by_username(db: &PgPool, username: &str) -> AppResult<User> {
    sqlx::query_as::<_, User>("select * from users where username = lower($1)")
        .bind(username)
        .fetch_optional(db)
        .await?
        .ok_or(AppError::NotFound("user"))
}

pub async fn update_profile(
    db: &PgPool,
    id: Uuid,
    display_name: Option<&str>,
    bio: Option<&str>,
) -> AppResult<User> {
    Ok(sqlx::query_as::<_, User>(
        "update users
         set display_name = coalesce($2, display_name), bio = coalesce($3, bio)
         where id = $1
         returning *",
    )
    .bind(id)
    .bind(display_name)
    .bind(bio)
    .fetch_one(db)
    .await?)
}

pub async fn start_session(db: &PgPool, user_id: Uuid) -> AppResult<String> {
    let token = token::generate();
    sqlx::query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)")
        .bind(token::digest(&token))
        .bind(user_id)
        .bind(Utc::now() + Duration::days(SESSION_LIFETIME_DAYS))
        .execute(db)
        .await?;
    Ok(token)
}

pub async fn user_for_token(db: &PgPool, token: &str) -> AppResult<Option<User>> {
    Ok(sqlx::query_as::<_, User>(
        "select users.* from sessions
         join users on users.id = sessions.user_id
         where sessions.token_hash = $1 and sessions.expires_at > now()",
    )
    .bind(token::digest(token))
    .fetch_optional(db)
    .await?)
}

pub async fn end_session(db: &PgPool, token: &str) -> AppResult<()> {
    sqlx::query("delete from sessions where token_hash = $1")
        .bind(token::digest(token))
        .execute(db)
        .await?;
    Ok(())
}
