use axum::Router;

use crate::app::AppState;

mod accounts;
pub mod auth;
mod chat;
mod connections;
mod discovery;
mod health;
mod leaderboards;
mod listening;
mod posts;
mod profiles;
mod realtime;
mod stats;

pub fn routes() -> Router<AppState> {
    Router::new()
        .merge(health::routes())
        .merge(accounts::routes())
        .merge(listening::routes())
        .merge(connections::routes())
        .merge(stats::routes())
        .merge(profiles::routes())
        .merge(posts::routes())
        .merge(discovery::routes())
        .merge(leaderboards::routes())
        .merge(chat::routes())
        .merge(realtime::routes())
}
