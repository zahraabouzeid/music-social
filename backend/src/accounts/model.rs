use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub password_hash: String,
    pub bio: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PublicUser {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PrivateUser {
    #[serde(flatten)]
    pub public: PublicUser,
    pub email: String,
}

impl From<&User> for PublicUser {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            username: user.username.clone(),
            display_name: user.display_name.clone(),
            bio: user.bio.clone(),
            created_at: user.created_at,
        }
    }
}

impl From<&User> for PrivateUser {
    fn from(user: &User) -> Self {
        Self {
            public: user.into(),
            email: user.email.clone(),
        }
    }
}
