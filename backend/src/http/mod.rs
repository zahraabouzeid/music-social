use axum::Router;

use crate::app::AppState;

mod accounts;
pub mod auth;
mod connections;
mod health;
mod listening;
mod profiles;
mod stats;

pub fn routes() -> Router<AppState> {
    Router::new()
        .merge(health::routes())
        .merge(accounts::routes())
        .merge(listening::routes())
        .merge(connections::routes())
        .merge(stats::routes())
        .merge(profiles::routes())
}
