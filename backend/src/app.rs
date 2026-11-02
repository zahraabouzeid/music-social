use axum::Router;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{config::Config, http, sources::Sources};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
    pub sources: Sources,
}

impl AppState {
    pub async fn connect(config: Config) -> anyhow::Result<Self> {
        let db = PgPoolOptions::new()
            .max_connections(20)
            .connect(&config.database_url)
            .await?;
        sqlx::migrate!("./migrations").run(&db).await?;
        Ok(Self::new(db, config))
    }

    pub fn new(db: PgPool, config: Config) -> Self {
        let sources = Sources::from_config(&config);
        Self {
            db,
            config,
            sources,
        }
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .nest("/api", http::routes())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
