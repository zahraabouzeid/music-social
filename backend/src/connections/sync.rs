use std::time::Duration;

use chrono::Utc;
use sqlx::PgPool;

use super::{Connection, repo};
use crate::{
    error::{AppError, AppResult},
    listening::{self, Play, Service},
    sources::{SourceError, Sources},
};

const WORKER_INTERVAL: Duration = Duration::from_secs(60);
const WORKER_BATCH: i64 = 100;

pub async fn sync(db: &PgPool, sources: &Sources, connection: &Connection) -> AppResult<u64> {
    let result = fetch(db, sources, connection).await;
    match result {
        Ok((service, plays)) => {
            let added =
                listening::repo::record_plays(db, connection.user_id, service, &plays).await?;
            let newest = plays.iter().map(|play| play.played_at).max();
            repo::mark_synced(db, connection.user_id, &connection.service, newest, None).await?;
            Ok(added)
        }
        Err(err) => {
            let message = err.to_string();
            repo::mark_synced(
                db,
                connection.user_id,
                &connection.service,
                None,
                Some(&message),
            )
            .await?;
            Err(err)
        }
    }
}

async fn fetch(
    db: &PgPool,
    sources: &Sources,
    connection: &Connection,
) -> AppResult<(Service, Vec<Play>)> {
    match connection.service.as_str() {
        "lastfm" => {
            let client = sources.lastfm.as_ref().ok_or_else(not_configured)?;
            let plays = client
                .plays_since(&connection.external_id, connection.synced_until)
                .await
                .map_err(source_error)?;
            Ok((Service::Lastfm, plays))
        }
        "spotify" => {
            let client = sources.spotify.as_ref().ok_or_else(not_configured)?;
            let mut access_token = connection.access_token.clone().unwrap_or_default();
            let expired = connection
                .token_expires_at
                .is_none_or(|at| at <= Utc::now());
            if expired {
                let refresh_token = connection.refresh_token.as_deref().ok_or_else(|| {
                    AppError::BadRequest("Spotify needs to be connected again".into())
                })?;
                let tokens = client.refresh(refresh_token).await.map_err(source_error)?;
                repo::store_tokens(db, connection.user_id, &connection.service, &tokens).await?;
                access_token = tokens.access_token;
            }
            let plays = client
                .plays_since(&access_token, connection.synced_until)
                .await
                .map_err(source_error)?;
            Ok((Service::Spotify, plays))
        }
        other => Err(AppError::BadRequest(format!("{other} cannot be synced"))),
    }
}

pub fn spawn_worker(db: PgPool, sources: Sources) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(WORKER_INTERVAL);
        loop {
            ticker.tick().await;
            if let Err(err) = run_once(&db, &sources).await {
                tracing::warn!(error = %err, "sync round failed");
            }
        }
    });
}

async fn run_once(db: &PgPool, sources: &Sources) -> AppResult<()> {
    for connection in repo::due(db, WORKER_BATCH).await? {
        match sync(db, sources, &connection).await {
            Ok(added) if added > 0 => {
                tracing::info!(service = %connection.service, user = %connection.user_id, added, "synced")
            }
            Ok(_) => {}
            Err(err) => {
                tracing::warn!(service = %connection.service, user = %connection.user_id, error = %err, "sync failed")
            }
        }
    }
    Ok(())
}

fn not_configured() -> AppError {
    AppError::BadRequest("this service is not set up on the server".into())
}

fn source_error(err: SourceError) -> AppError {
    AppError::BadRequest(err.to_string())
}
