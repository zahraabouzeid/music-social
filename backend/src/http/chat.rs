use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use super::auth::CurrentUser;
use crate::{
    accounts::repo as accounts,
    app::AppState,
    chat::{Conversation, Message, NewMessage, repo},
    error::{AppError, AppResult},
    stats::{self, Period},
};

const MAX_BODY: usize = 2000;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/conversations", get(list))
        .route("/conversations/direct", post(open_direct))
        .route("/conversations/group", post(create_group))
        .route("/conversations/{id}", get(detail).delete(leave))
        .route("/conversations/{id}/members", post(add_member))
        .route("/conversations/{id}/messages", get(messages).post(send))
        .route("/conversations/{id}/read", post(mark_read))
}

async fn list(
    State(state): State<AppState>,
    current: CurrentUser,
) -> AppResult<Json<Vec<Conversation>>> {
    Ok(Json(repo::list(&state.db, current.user.id).await?))
}

#[derive(Deserialize)]
struct DirectRequest {
    username: String,
}

async fn open_direct(
    State(state): State<AppState>,
    current: CurrentUser,
    Json(body): Json<DirectRequest>,
) -> AppResult<Json<Conversation>> {
    let other = accounts::find_by_username(&state.db, &body.username).await?;
    let id = repo::open_direct(&state.db, current.user.id, other.id).await?;
    Ok(Json(repo::find(&state.db, id, current.user.id).await?))
}

#[derive(Deserialize)]
struct GroupRequest {
    title: String,
    usernames: Vec<String>,
}

async fn create_group(
    State(state): State<AppState>,
    current: CurrentUser,
    Json(body): Json<GroupRequest>,
) -> AppResult<(StatusCode, Json<Conversation>)> {
    let title = body.title.trim();
    if !(1..=60).contains(&title.chars().count()) {
        return Err(AppError::BadRequest(
            "a group name needs 1 to 60 characters".into(),
        ));
    }
    let mut members = Vec::with_capacity(body.usernames.len());
    for username in &body.usernames {
        members.push(accounts::find_by_username(&state.db, username).await?.id);
    }
    let id = repo::create_group(&state.db, current.user.id, title, &members).await?;
    Ok((
        StatusCode::CREATED,
        Json(repo::find(&state.db, id, current.user.id).await?),
    ))
}

async fn detail(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Conversation>> {
    Ok(Json(repo::find(&state.db, id, current.user.id).await?))
}

async fn leave(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    repo::ensure_member(&state.db, id, current.user.id).await?;
    repo::leave(&state.db, id, current.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn add_member(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
    Json(body): Json<DirectRequest>,
) -> AppResult<Json<Conversation>> {
    repo::ensure_member(&state.db, id, current.user.id).await?;
    let user = accounts::find_by_username(&state.db, &body.username).await?;
    repo::add_member(&state.db, id, user.id).await?;
    Ok(Json(repo::find(&state.db, id, current.user.id).await?))
}

#[derive(Deserialize)]
struct PageQuery {
    before: Option<DateTime<Utc>>,
    limit: Option<i64>,
}

async fn messages(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
    Query(query): Query<PageQuery>,
) -> AppResult<Json<Vec<Message>>> {
    repo::ensure_member(&state.db, id, current.user.id).await?;
    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    Ok(Json(
        repo::messages(&state.db, id, query.before, limit).await?,
    ))
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum SendRequest {
    Text {
        body: String,
    },
    Track {
        track_id: i64,
        #[serde(default)]
        body: String,
    },
    Stats {
        period: Period,
        #[serde(default)]
        body: String,
    },
}

async fn send(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
    Json(request): Json<SendRequest>,
) -> AppResult<(StatusCode, Json<Message>)> {
    repo::ensure_member(&state.db, id, current.user.id).await?;
    let message = match request {
        SendRequest::Text { body } => {
            let body = body_text(&body)?;
            if body.is_empty() {
                return Err(AppError::BadRequest("write something first".into()));
            }
            NewMessage::Text { body }
        }
        SendRequest::Track { track_id, body } => NewMessage::Track {
            track_id,
            body: body_text(&body)?,
        },
        SendRequest::Stats { period, body } => NewMessage::Stats {
            payload: stats::snapshot(&state.db, current.user.id, period).await?,
            body: body_text(&body)?,
        },
    };
    let message = repo::send(&state.db, id, current.user.id, message).await?;
    Ok((StatusCode::CREATED, Json(message)))
}

async fn mark_read(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    repo::ensure_member(&state.db, id, current.user.id).await?;
    repo::mark_read(&state.db, id, current.user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

fn body_text(raw: &str) -> AppResult<String> {
    let body = raw.trim();
    if body.chars().count() > MAX_BODY {
        return Err(AppError::BadRequest(format!(
            "messages can have at most {MAX_BODY} characters"
        )));
    }
    Ok(body.to_string())
}
