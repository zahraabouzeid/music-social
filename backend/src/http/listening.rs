use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Query, State},
    http::StatusCode,
    routing::get,
};
use serde::Deserialize;

use super::auth::CurrentUser;
use crate::{
    app::AppState,
    error::{AppError, AppResult},
    listening::repo::{self, ImportRecord, RecentPlay},
    sources,
};

const MAX_EXPORT_BYTES: usize = 64 * 1024 * 1024;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/imports",
            get(list_imports)
                .post(import_export)
                .layer(DefaultBodyLimit::max(MAX_EXPORT_BYTES)),
        )
        .route("/me/plays", get(recent_plays))
}

async fn import_export(
    State(state): State<AppState>,
    current: CurrentUser,
    body: Bytes,
) -> AppResult<(StatusCode, Json<ImportRecord>)> {
    let parsed =
        sources::parse_export(&body).map_err(|err| AppError::BadRequest(err.to_string()))?;
    let added =
        repo::record_plays(&state.db, current.user.id, parsed.service, &parsed.plays).await?;
    let record = repo::log_import(
        &state.db,
        current.user.id,
        parsed.service,
        parsed.plays.len(),
        added,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(record)))
}

async fn list_imports(
    State(state): State<AppState>,
    current: CurrentUser,
) -> AppResult<Json<Vec<ImportRecord>>> {
    Ok(Json(repo::imports(&state.db, current.user.id).await?))
}

#[derive(Deserialize)]
struct RecentQuery {
    limit: Option<i64>,
}

async fn recent_plays(
    State(state): State<AppState>,
    current: CurrentUser,
    Query(query): Query<RecentQuery>,
) -> AppResult<Json<Vec<RecentPlay>>> {
    let limit = query.limit.unwrap_or(50).clamp(1, 200);
    Ok(Json(repo::recent(&state.db, current.user.id, limit).await?))
}
