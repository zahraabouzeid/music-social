use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{
    accounts::repo as accounts,
    app::AppState,
    error::AppResult,
    stats::{Period, repo},
};

pub fn routes() -> Router<AppState> {
    Router::new().route("/users/{username}/stats", get(user_stats))
}

#[derive(Deserialize)]
struct PeriodQuery {
    #[serde(default)]
    period: Period,
}

#[derive(Serialize)]
struct StatsResponse {
    period: Period,
    #[serde(flatten)]
    overview: repo::Overview,
}

async fn user_stats(
    State(state): State<AppState>,
    Path(username): Path<String>,
    Query(query): Query<PeriodQuery>,
) -> AppResult<Json<StatsResponse>> {
    let user = accounts::find_by_username(&state.db, &username).await?;
    let overview = repo::overview(&state.db, user.id, query.period.start(Utc::now())).await?;
    Ok(Json(StatsResponse {
        period: query.period,
        overview,
    }))
}
