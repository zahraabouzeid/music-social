use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use serde::Deserialize;
use uuid::Uuid;

use super::auth::{CurrentUser, MaybeUser};
use crate::{
    accounts::repo as accounts,
    app::AppState,
    error::{AppError, AppResult},
    social::{
        posts::{self, NewPost, PostView},
        taste,
    },
    stats::{self, Period},
};

const TASTE_POOL: i64 = 500;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/feed", get(feed))
        .route("/posts", post(create))
        .route("/posts/{id}", axum::routing::delete(remove))
        .route("/posts/{id}/like", axum::routing::put(like).delete(unlike))
        .route("/users/{username}/posts", get(by_user))
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum CreatePost {
    Track {
        track_id: i64,
        #[serde(default)]
        caption: String,
    },
    Stats {
        period: Period,
        #[serde(default)]
        caption: String,
    },
    Text {
        caption: String,
    },
}

async fn create(
    State(state): State<AppState>,
    current: CurrentUser,
    Json(body): Json<CreatePost>,
) -> AppResult<(StatusCode, Json<PostView>)> {
    let new = match body {
        CreatePost::Track { track_id, caption } => NewPost::Track {
            track_id,
            caption: caption_text(&caption)?,
        },
        CreatePost::Stats { period, caption } => NewPost::Stats {
            payload: stats::snapshot(&state.db, current.user.id, period).await?,
            caption: caption_text(&caption)?,
        },
        CreatePost::Text { caption } => {
            let caption = caption_text(&caption)?;
            if caption.is_empty() {
                return Err(AppError::BadRequest("write something first".into()));
            }
            NewPost::Text { caption }
        }
    };
    let post = posts::create(&state.db, current.user.id, new).await?;
    Ok((StatusCode::CREATED, Json(post)))
}

fn caption_text(raw: &str) -> AppResult<String> {
    let caption = raw.trim();
    if caption.chars().count() > 500 {
        return Err(AppError::BadRequest(
            "captions can have at most 500 characters".into(),
        ));
    }
    Ok(caption.to_string())
}

async fn remove(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    posts::delete(&state.db, id, current.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn like(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    posts::like(&state.db, id, current.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn unlike(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    posts::unlike(&state.db, id, current.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn feed(
    State(state): State<AppState>,
    current: CurrentUser,
) -> AppResult<Json<Vec<PostView>>> {
    let similar = taste::similarities(&state.db, current.user.id, TASTE_POOL).await?;
    Ok(Json(
        posts::feed(&state.db, current.user.id, &similar).await?,
    ))
}

async fn by_user(
    State(state): State<AppState>,
    MaybeUser(viewer): MaybeUser,
    Path(username): Path<String>,
) -> AppResult<Json<Vec<PostView>>> {
    let author = accounts::find_by_username(&state.db, &username).await?;
    let viewer = viewer.map(|viewer| viewer.user.id);
    Ok(Json(posts::by_author(&state.db, author.id, viewer).await?))
}
