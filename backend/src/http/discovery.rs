use axum::{
    Json, Router,
    extract::{Path, State},
    routing::get,
};
use serde::Serialize;

use super::auth::CurrentUser;
use crate::{
    accounts::{PublicUser, repo as accounts},
    app::AppState,
    error::AppResult,
    social::taste::{self, Match},
};

const SUGGESTION_POOL: i64 = 60;
const SUGGESTIONS: usize = 12;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/suggestions", get(suggestions))
        .route("/users/{username}/match", get(match_with))
}

#[derive(Serialize)]
struct Suggestion {
    user: PublicUser,
    similarity: f64,
    shared_artists: Vec<String>,
}

async fn suggestions(
    State(state): State<AppState>,
    current: CurrentUser,
) -> AppResult<Json<Vec<Suggestion>>> {
    let viewer = current.user.id;
    let similar = taste::similarities(&state.db, viewer, SUGGESTION_POOL).await?;
    let ids: Vec<_> = similar.keys().copied().collect();
    let mut candidates = taste::not_followed(&state.db, viewer, &ids).await?;
    candidates.sort_by(|a, b| similar[&b.id].total_cmp(&similar[&a.id]));

    let mut result = Vec::new();
    for user in candidates.into_iter().take(SUGGESTIONS) {
        result.push(Suggestion {
            similarity: similar[&user.id],
            shared_artists: taste::shared_artists(&state.db, viewer, user.id).await?,
            user: (&user).into(),
        });
    }
    Ok(Json(result))
}

async fn match_with(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(username): Path<String>,
) -> AppResult<Json<Match>> {
    let other = accounts::find_by_username(&state.db, &username).await?;
    Ok(Json(
        taste::match_between(&state.db, current.user.id, other.id).await?,
    ))
}
