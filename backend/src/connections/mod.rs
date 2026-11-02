pub mod repo;
pub mod sync;

use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct Connection {
    pub user_id: Uuid,
    pub service: String,
    pub external_id: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub token_expires_at: Option<DateTime<Utc>>,
    pub synced_until: Option<DateTime<Utc>>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConnectionSummary {
    pub service: String,
    pub external_id: String,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
}

impl From<Connection> for ConnectionSummary {
    fn from(connection: Connection) -> Self {
        Self {
            service: connection.service,
            external_id: connection.external_id,
            last_synced_at: connection.last_synced_at,
            last_error: connection.last_error,
        }
    }
}
