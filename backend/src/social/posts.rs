use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use super::ranking::{self, Relationship, Signals};
use crate::error::{AppError, AppResult};

const FEED_WINDOW_DAYS: i32 = 14;
const FEED_CANDIDATES: i64 = 400;
const FEED_SIZE: usize = 50;

pub enum NewPost {
    Track { track_id: i64, caption: String },
    Stats { payload: Value, caption: String },
    Text { caption: String },
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PostRow {
    pub id: Uuid,
    pub kind: String,
    pub caption: String,
    pub payload: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub author_id: Uuid,
    pub author_username: String,
    pub author_display_name: String,
    pub track_id: Option<i64>,
    pub track_title: Option<String>,
    pub track_artist: Option<String>,
    pub track_album: Option<String>,
    pub likes: i64,
    pub liked_by_me: bool,
}

#[derive(Debug, Serialize)]
pub struct PostView {
    pub id: Uuid,
    pub kind: String,
    pub caption: String,
    pub payload: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub author: Author,
    pub track: Option<TrackRef>,
    pub likes: i64,
    pub liked_by_me: bool,
}

#[derive(Debug, Serialize)]
pub struct Author {
    pub username: String,
    pub display_name: String,
}

#[derive(Debug, Serialize)]
pub struct TrackRef {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
}

impl From<PostRow> for PostView {
    fn from(row: PostRow) -> Self {
        let track = match (row.track_id, row.track_title, row.track_artist) {
            (Some(id), Some(title), Some(artist)) => Some(TrackRef {
                id,
                title,
                artist,
                album: row.track_album,
            }),
            _ => None,
        };
        Self {
            id: row.id,
            kind: row.kind,
            caption: row.caption,
            payload: row.payload,
            created_at: row.created_at,
            author: Author {
                username: row.author_username,
                display_name: row.author_display_name,
            },
            track,
            likes: row.likes,
            liked_by_me: row.liked_by_me,
        }
    }
}

macro_rules! select_posts {
    () => {
        "
    select p.id, p.kind, p.caption, p.payload, p.created_at,
           u.id as author_id, u.username as author_username, u.display_name as author_display_name,
           t.id as track_id, t.title as track_title, t.artist as track_artist, t.album as track_album,
           (select count(*) from likes where likes.post_id = p.id) as likes,
           exists(select 1 from likes where likes.post_id = p.id and likes.user_id = $1) as liked_by_me
    from posts p
    join users u on u.id = p.user_id
    left join tracks t on t.id = p.track_id"
    };
}

pub async fn create(db: &PgPool, user_id: Uuid, post: NewPost) -> AppResult<PostView> {
    let (kind, track_id, payload, caption) = match post {
        NewPost::Track { track_id, caption } => ("track", Some(track_id), None, caption),
        NewPost::Stats { payload, caption } => ("stats", None, Some(payload), caption),
        NewPost::Text { caption } => ("text", None, None, caption),
    };
    let id: Uuid = sqlx::query_scalar(
        "insert into posts (user_id, kind, track_id, payload, caption) values ($1, $2, $3, $4, $5) returning id",
    )
    .bind(user_id)
    .bind(kind)
    .bind(track_id)
    .bind(payload)
    .bind(caption)
    .fetch_one(db)
    .await
    .map_err(|err| match &err {
        sqlx::Error::Database(db_err) if db_err.is_foreign_key_violation() => AppError::NotFound("track"),
        _ => err.into(),
    })?;
    find(db, id, user_id).await
}

pub async fn find(db: &PgPool, id: Uuid, viewer: Uuid) -> AppResult<PostView> {
    sqlx::query_as::<_, PostRow>(concat!(select_posts!(), " where p.id = $2"))
        .bind(viewer)
        .bind(id)
        .fetch_optional(db)
        .await?
        .map(Into::into)
        .ok_or(AppError::NotFound("post"))
}

pub async fn delete(db: &PgPool, id: Uuid, user_id: Uuid) -> AppResult<()> {
    let deleted = sqlx::query("delete from posts where id = $1 and user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(db)
        .await?
        .rows_affected();
    if deleted == 0 {
        return Err(AppError::NotFound("post"));
    }
    Ok(())
}

pub async fn like(db: &PgPool, post_id: Uuid, user_id: Uuid) -> AppResult<()> {
    sqlx::query("insert into likes (post_id, user_id) values ($1, $2) on conflict do nothing")
        .bind(post_id)
        .bind(user_id)
        .execute(db)
        .await
        .map_err(|err| match &err {
            sqlx::Error::Database(db_err) if db_err.is_foreign_key_violation() => {
                AppError::NotFound("post")
            }
            _ => err.into(),
        })?;
    Ok(())
}

pub async fn unlike(db: &PgPool, post_id: Uuid, user_id: Uuid) -> AppResult<()> {
    sqlx::query("delete from likes where post_id = $1 and user_id = $2")
        .bind(post_id)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn by_author(
    db: &PgPool,
    author: Uuid,
    viewer: Option<Uuid>,
) -> AppResult<Vec<PostView>> {
    let rows = sqlx::query_as::<_, PostRow>(concat!(
        select_posts!(),
        " where p.user_id = $2 order by p.created_at desc limit 100"
    ))
    .bind(viewer.unwrap_or_default())
    .bind(author)
    .fetch_all(db)
    .await?;
    Ok(rows.into_iter().map(Into::into).collect())
}

pub async fn feed(
    db: &PgPool,
    viewer: Uuid,
    taste: &std::collections::HashMap<Uuid, f64>,
) -> AppResult<Vec<PostView>> {
    let rows = sqlx::query_as::<_, PostRow>(concat!(
        select_posts!(),
        " where p.created_at > now() - make_interval(days => $2)
          order by p.created_at desc
          limit $3"
    ))
    .bind(viewer)
    .bind(FEED_WINDOW_DAYS)
    .bind(FEED_CANDIDATES)
    .fetch_all(db)
    .await?;

    let following: std::collections::HashSet<Uuid> =
        sqlx::query_scalar::<_, Uuid>("select followee_id from follows where follower_id = $1")
            .bind(viewer)
            .fetch_all(db)
            .await?
            .into_iter()
            .collect();

    let now = Utc::now();
    let mut scored: Vec<(f64, PostRow)> = rows
        .into_iter()
        .map(|row| {
            let relationship = if row.author_id == viewer {
                Relationship::Own
            } else if following.contains(&row.author_id) {
                Relationship::Following
            } else {
                Relationship::Stranger
            };
            let signals = Signals {
                age_hours: (now - row.created_at).num_minutes() as f64 / 60.0,
                likes: row.likes,
                relationship,
                taste_similarity: taste.get(&row.author_id).copied().unwrap_or(0.0),
            };
            (ranking::score(signals), row)
        })
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));
    Ok(scored
        .into_iter()
        .take(FEED_SIZE)
        .map(|(_, row)| row.into())
        .collect())
}
