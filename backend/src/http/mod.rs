use axum::Router;

use crate::app::AppState;

mod accounts;
pub mod auth;
mod health;

pub fn routes() -> Router<AppState> {
    Router::new()
        .merge(health::routes())
        .merge(accounts::routes())
}
