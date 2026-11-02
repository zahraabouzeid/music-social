use axum::{
    Router,
    extract::{
        Query, State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::Response,
    routing::get,
};
use serde::Deserialize;
use tokio::sync::broadcast::error::RecvError;
use uuid::Uuid;

use crate::{
    accounts::repo as accounts,
    app::AppState,
    error::{AppError, AppResult},
};

pub fn routes() -> Router<AppState> {
    Router::new().route("/ws", get(connect))
}

#[derive(Deserialize)]
struct ConnectQuery {
    token: String,
}

async fn connect(
    State(state): State<AppState>,
    Query(query): Query<ConnectQuery>,
    upgrade: WebSocketUpgrade,
) -> AppResult<Response> {
    let user = accounts::user_for_token(&state.db, &query.token)
        .await?
        .ok_or(AppError::Unauthorized)?;
    Ok(upgrade.on_upgrade(move |socket| relay(socket, state, user.id)))
}

async fn relay(mut socket: WebSocket, state: AppState, user_id: Uuid) {
    let mut events = state.hub.subscribe();
    loop {
        tokio::select! {
            event = events.recv() => match event {
                Ok(event) if event.recipients.contains(&user_id) => {
                    if socket.send(Message::Text(event.data.to_string().into())).await.is_err() {
                        break;
                    }
                }
                Ok(_) | Err(RecvError::Lagged(_)) => {}
                Err(RecvError::Closed) => break,
            },
            incoming = socket.recv() => match incoming {
                Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                Some(Ok(_)) => {}
            },
        }
    }
}
