use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};

use super::auth::CurrentUser;
use crate::{
    accounts::{PrivateUser, password, repo, validate},
    app::AppState,
    error::{AppError, AppResult},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/logout", post(logout))
        .route("/me", get(me).patch(update_me))
}

#[derive(Deserialize)]
struct RegisterRequest {
    username: String,
    display_name: String,
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    login: String,
    password: String,
}

#[derive(Serialize)]
struct SessionResponse {
    token: String,
    user: PrivateUser,
}

#[derive(Deserialize)]
struct UpdateProfileRequest {
    display_name: Option<String>,
    bio: Option<String>,
}

async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<SessionResponse>)> {
    validate::password(&body.password)?;
    let new = repo::NewUser {
        username: validate::username(&body.username)?,
        display_name: validate::display_name(&body.display_name)?,
        email: validate::email(&body.email)?,
        password_hash: password::hash(body.password).await?,
    };
    let user = repo::create(&state.db, new).await?;
    let token = repo::start_session(&state.db, user.id).await?;
    Ok((
        StatusCode::CREATED,
        Json(SessionResponse {
            token,
            user: (&user).into(),
        }),
    ))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<SessionResponse>> {
    let user = repo::find_by_login(&state.db, &body.login)
        .await?
        .ok_or(AppError::Unauthorized)?;
    if !password::verify(body.password, user.password_hash.clone()).await? {
        return Err(AppError::Unauthorized);
    }
    let token = repo::start_session(&state.db, user.id).await?;
    Ok(Json(SessionResponse {
        token,
        user: (&user).into(),
    }))
}

async fn logout(State(state): State<AppState>, current: CurrentUser) -> AppResult<StatusCode> {
    repo::end_session(&state.db, &current.token).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn me(current: CurrentUser) -> Json<PrivateUser> {
    Json((&current.user).into())
}

async fn update_me(
    State(state): State<AppState>,
    current: CurrentUser,
    Json(body): Json<UpdateProfileRequest>,
) -> AppResult<Json<PrivateUser>> {
    let display_name = body
        .display_name
        .as_deref()
        .map(validate::display_name)
        .transpose()?;
    let bio = body.bio.as_deref().map(validate::bio).transpose()?;
    let user = repo::update_profile(
        &state.db,
        current.user.id,
        display_name.as_deref(),
        bio.as_deref(),
    )
    .await?;
    Ok(Json((&user).into()))
}
