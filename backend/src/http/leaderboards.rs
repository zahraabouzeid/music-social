use axum::{
    Json, Router,
    extract::{Query, State},
    routing::get,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use super::auth::CurrentUser;
use crate::{
    app::AppState,
    error::AppResult,
    social::leaderboards::{self, Entry, Scope},
    stats::Period,
};

pub fn routes() -> Router<AppState> {
    Router::new().route("/leaderboards", get(board))
}

#[derive(Deserialize)]
struct BoardQuery {
    #[serde(default)]
    scope: Scope,
    #[serde(default = "week")]
    period: Period,
    artist: Option<String>,
}

fn week() -> Period {
    Period::Week
}

#[derive(Serialize)]
struct Board {
    scope: Scope,
    period: Period,
    artist: Option<String>,
    entries: Vec<Entry>,
}

async fn board(
    State(state): State<AppState>,
    current: CurrentUser,
    Query(query): Query<BoardQuery>,
) -> AppResult<Json<Board>> {
    let artist = query
        .artist
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty());
    let entries = leaderboards::listeners(
        &state.db,
        current.user.id,
        query.scope,
        query.period.start(Utc::now()),
        artist.as_deref(),
    )
    .await?;
    Ok(Json(Board {
        scope: query.scope,
        period: query.period,
        artist,
        entries,
    }))
}
