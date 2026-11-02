use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Redirect,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use super::auth::CurrentUser;
use crate::{
    app::AppState,
    connections::{ConnectionSummary, repo, sync},
    error::{AppError, AppResult},
    listening::Service,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/connections", get(list))
        .route("/connections/lastfm", post(connect_lastfm))
        .route("/connections/spotify/authorize", get(spotify_authorize))
        .route("/connections/spotify/callback", get(spotify_callback))
        .route("/connections/{service}", axum::routing::delete(disconnect))
        .route("/connections/{service}/sync", post(sync_now))
}

#[derive(Serialize)]
struct ConnectionsResponse {
    available: Vec<Service>,
    connected: Vec<ConnectionSummary>,
}

async fn list(
    State(state): State<AppState>,
    current: CurrentUser,
) -> AppResult<Json<ConnectionsResponse>> {
    let connected = repo::list(&state.db, current.user.id).await?;
    Ok(Json(ConnectionsResponse {
        available: state.sources.available(),
        connected: connected.into_iter().map(Into::into).collect(),
    }))
}

#[derive(Deserialize)]
struct LastfmRequest {
    username: String,
}

async fn connect_lastfm(
    State(state): State<AppState>,
    current: CurrentUser,
    Json(body): Json<LastfmRequest>,
) -> AppResult<StatusCode> {
    let client = state.sources.lastfm.as_ref().ok_or_else(not_configured)?;
    let username = body.username.trim();
    let exists = client
        .user_exists(username)
        .await
        .map_err(|err| AppError::BadRequest(err.to_string()))?;
    if !exists {
        return Err(AppError::BadRequest(
            "this Last.fm user does not exist".into(),
        ));
    }
    repo::save(&state.db, current.user.id, Service::Lastfm, username, None).await?;
    Ok(StatusCode::CREATED)
}

async fn spotify_authorize(
    State(state): State<AppState>,
    current: CurrentUser,
) -> AppResult<Json<Value>> {
    let client = state.sources.spotify.as_ref().ok_or_else(not_configured)?;
    let oauth_state = repo::create_oauth_state(&state.db, current.user.id).await?;
    Ok(Json(json!({ "url": client.authorize_url(&oauth_state) })))
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

async fn spotify_callback(
    State(state): State<AppState>,
    Query(query): Query<CallbackQuery>,
) -> Redirect {
    let target = format!("{}/connections", state.config.app_url);
    match finish_spotify(&state, query).await {
        Ok(()) => Redirect::to(&format!("{target}?connected=spotify")),
        Err(err) => {
            tracing::warn!(error = %err, "spotify connection failed");
            Redirect::to(&format!("{target}?error=spotify"))
        }
    }
}

async fn finish_spotify(state: &AppState, query: CallbackQuery) -> AppResult<()> {
    if let Some(error) = query.error {
        return Err(AppError::BadRequest(error));
    }
    let (Some(code), Some(oauth_state)) = (query.code, query.state) else {
        return Err(AppError::BadRequest("missing code".into()));
    };
    let user_id = repo::take_oauth_state(&state.db, &oauth_state).await?;
    let client = state.sources.spotify.as_ref().ok_or_else(not_configured)?;
    let tokens = client
        .exchange_code(&code)
        .await
        .map_err(|err| AppError::BadRequest(err.to_string()))?;
    let account_id = client
        .account_id(&tokens.access_token)
        .await
        .map_err(|err| AppError::BadRequest(err.to_string()))?;
    repo::save(
        &state.db,
        user_id,
        Service::Spotify,
        &account_id,
        Some(&tokens),
    )
    .await
}

async fn disconnect(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(service): Path<Service>,
) -> AppResult<StatusCode> {
    repo::delete(&state.db, current.user.id, service).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn sync_now(
    State(state): State<AppState>,
    current: CurrentUser,
    Path(service): Path<Service>,
) -> AppResult<Json<Value>> {
    let connection = repo::find(&state.db, current.user.id, service).await?;
    let added = sync::sync(&state.db, &state.sources, &connection).await?;
    Ok(Json(json!({ "plays_added": added })))
}

fn not_configured() -> AppError {
    AppError::BadRequest("this service is not set up on the server".into())
}
