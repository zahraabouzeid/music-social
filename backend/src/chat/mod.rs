pub mod repo;

use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use uuid::Uuid;

pub enum NewMessage {
    Text { body: String },
    Track { track_id: i64, body: String },
    Stats { payload: Value, body: String },
}

#[derive(Debug, Clone, Serialize)]
pub struct Member {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TrackRef {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Message {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub kind: String,
    pub body: String,
    pub payload: Option<Value>,
    pub track: Option<TrackRef>,
    pub sender: Member,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct Preview {
    pub kind: String,
    pub body: String,
    pub sender_username: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct Conversation {
    pub id: Uuid,
    pub kind: String,
    pub title: Option<String>,
    pub members: Vec<Member>,
    pub last_message: Option<Preview>,
    pub unread: i64,
    pub created_at: DateTime<Utc>,
}
