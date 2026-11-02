use music_social::{app, config::Config, connections};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = Config::from_env()?;
    let state = app::AppState::connect(config.clone()).await?;
    connections::sync::spawn_worker(state.db.clone(), state.sources.clone());
    let listener = tokio::net::TcpListener::bind(config.bind_addr).await?;
    tracing::info!(addr = %config.bind_addr, "listening");
    axum::serve(listener, app::router(state)).await?;
    Ok(())
}
