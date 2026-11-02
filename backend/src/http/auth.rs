use axum::{extract::FromRequestParts, http::request::Parts};

use crate::{
    accounts::{User, repo},
    app::AppState,
    error::AppError,
};

pub struct CurrentUser {
    pub user: User,
    pub token: String,
}

impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or(AppError::Unauthorized)?
            .to_string();
        let user = repo::user_for_token(&state.db, &token)
            .await?
            .ok_or(AppError::Unauthorized)?;
        Ok(Self { user, token })
    }
}

pub struct MaybeUser(pub Option<CurrentUser>);

impl FromRequestParts<AppState> for MaybeUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        if parts
            .headers
            .contains_key(axum::http::header::AUTHORIZATION)
        {
            CurrentUser::from_request_parts(parts, state)
                .await
                .map(|user| Self(Some(user)))
        } else {
            Ok(Self(None))
        }
    }
}
