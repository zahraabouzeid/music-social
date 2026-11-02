use std::time::Duration;

use sqlx::PgPool;

use super::{Connection, repo, sync::spotify_token};
use crate::{
    error::AppResult,
    listening::{NowPlaying, Service, now_playing},
    sources::Sources,
};

const INTERVAL: Duration = Duration::from_secs(45);

pub async fn refresh(db: &PgPool, sources: &Sources, connection: &Connection) -> AppResult<()> {
    let (service, current) = match connection.service.as_str() {
        "lastfm" => match &sources.lastfm {
            Some(client) => (
                Service::Lastfm,
                client
                    .now_playing(&connection.external_id)
                    .await
                    .ok()
                    .flatten(),
            ),
            None => return Ok(()),
        },
        "spotify" => match &sources.spotify {
            Some(client) => {
                let token = spotify_token(db, client, connection).await?;
                (
                    Service::Spotify,
                    client.now_playing(&token).await.ok().flatten(),
                )
            }
            None => return Ok(()),
        },
        _ => return Ok(()),
    };
    store(db, connection, service, current).await
}

async fn store(
    db: &PgPool,
    connection: &Connection,
    service: Service,
    current: Option<NowPlaying>,
) -> AppResult<()> {
    match current {
        Some(track) => now_playing::set(db, connection.user_id, service, &track).await,
        None => now_playing::clear(db, connection.user_id, service).await,
    }
}

pub fn spawn_worker(db: PgPool, sources: Sources) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(INTERVAL);
        loop {
            ticker.tick().await;
            match repo::all(&db).await {
                Ok(connections) => {
                    for connection in connections {
                        if let Err(err) = refresh(&db, &sources, &connection).await {
                            tracing::debug!(service = %connection.service, error = %err, "now playing refresh failed");
                        }
                    }
                }
                Err(err) => tracing::warn!(error = %err, "listing connections failed"),
            }
        }
    });
}
