use chrono::Utc;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use super::{Period, repo};
use crate::error::{AppError, AppResult};

const SHARE_SIZE: usize = 5;

pub async fn snapshot(db: &PgPool, user_id: Uuid, period: Period) -> AppResult<Value> {
    let overview = repo::overview(db, user_id, period.start(Utc::now())).await?;
    if overview.totals.plays == 0 {
        return Err(AppError::BadRequest(
            "there are no plays in this period yet".into(),
        ));
    }
    Ok(json!({
        "period": period,
        "totals": overview.totals,
        "top_artists": overview.top_artists.iter().take(SHARE_SIZE).collect::<Vec<_>>(),
        "top_tracks": overview.top_tracks.iter().take(SHARE_SIZE).collect::<Vec<_>>(),
    }))
}
