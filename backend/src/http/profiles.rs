use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
};
use serde::{Deserialize, Serialize};

use super::auth::{CurrentUser, MaybeUser};
use crate::{
    accounts::{PublicUser, repo as accounts},
    app::AppState,
    error::AppResult,
    social::follows::{self, Counts},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(search))
        .route("/users/{username}", get(profile))
        .route(
            "/users/{username}/follow",
            axum::routing::put(follow).delete(unfollow),
        )
        .route("/users/{username}/followers", get(followers))
        .route("/users/{username}/following", get(following))
}

#[derive(Serialize)]
struct Profile {
    #[serde(flatten)]
    user: PublicUser,
    counts: Counts,
    is_following: bool,
    is_self: bool,
}

async fn profile(
    State(state): State<AppState>,
    MaybeUser(viewer): MaybeUser,
    Path(username): Path<String>,
) -> AppResult<Json<Profile>> {
    let user = accounts::find_by_username(&state.db, &username).await?;
    let counts = follows::counts(&state.db, user.id).await?;
    let (is_following, is_self) = match &viewer {
        Some(viewer) if viewer.user.id == user.id => (false, true),
        Some(viewer) => (
            follows::is_following(&state.db, viewer.user.id, user.id).await?,
            false,
        ),
        None => (false, false),
    };
    Ok(Json(Profile {
        user: (&user).into(),
        counts,
        is_following,
        is_self,
    }))
}

async fn follow(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(username): Path<String>,
) -> AppResult<StatusCode> {
    let target = accounts::find_by_username(&state.db, &username).await?;
    follows::follow(&state.db, current.user.id, target.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn unfollow(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(username): Path<String>,
) -> AppResult<StatusCode> {
    let target = accounts::find_by_username(&state.db, &username).await?;
    follows::unfollow(&state.db, current.user.id, target.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn followers(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> AppResult<Json<Vec<PublicUser>>> {
    let user = accounts::find_by_username(&state.db, &username).await?;
    Ok(Json(follows::followers(&state.db, user.id).await?))
}

async fn following(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> AppResult<Json<Vec<PublicUser>>> {
    let user = accounts::find_by_username(&state.db, &username).await?;
    Ok(Json(follows::following(&state.db, user.id).await?))
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

async fn search(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> AppResult<Json<Vec<PublicUser>>> {
    if query.q.trim().is_empty() {
        return Ok(Json(Vec::new()));
    }
    Ok(Json(follows::search(&state.db, &query.q).await?))
}
