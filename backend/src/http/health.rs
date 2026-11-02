use axum::{Json, Router, extract::State, routing::get};
use serde_json::{Value, json};

use crate::{app::AppState, error::AppResult};

pub fn routes() -> Router<AppState> {
    Router::new().route("/health", get(health))
}

async fn health(State(state): State<AppState>) -> AppResult<Json<Value>> {
    sqlx::query("select 1").execute(&state.db).await?;
    Ok(Json(json!({ "status": "ok" })))
}
