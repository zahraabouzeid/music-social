use std::time::Duration;

use futures_util::StreamExt;
use music_social::{app, config::Config};
use serde_json::{Value, json};
use sqlx::PgPool;
use tokio_tungstenite::tungstenite::Message;

async fn serve(db: PgPool) -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let router = app::router(app::AppState::new(db, Config::for_tests()));
    tokio::spawn(async move { axum::serve(listener, router).await.unwrap() });
    format!("127.0.0.1:{}", addr.port())
}

async fn call(client: &reqwest::Client, url: String, token: Option<&str>, body: Value) -> Value {
    let mut request = client.post(url).json(&body);
    if let Some(token) = token {
        request = request.bearer_auth(token);
    }
    request.send().await.unwrap().json().await.unwrap()
}

#[sqlx::test]
async fn members_receive_new_messages_live(db: PgPool) {
    let addr = serve(db).await;
    let client = reqwest::Client::new();
    let api = |path: &str| format!("http://{addr}/api{path}");
    let mut tokens = Vec::new();
    for name in ["mira", "noah", "lea"] {
        let session = call(
            &client,
            api("/auth/register"),
            None,
            json!({"username": name, "display_name": name, "email": format!("{name}@example.com"), "password": "listening123"}),
        )
        .await;
        tokens.push(session["token"].as_str().unwrap().to_string());
    }
    let (mira, noah, lea) = (&tokens[0], &tokens[1], &tokens[2]);

    let (mut noah_socket, _) =
        tokio_tungstenite::connect_async(format!("ws://{addr}/api/ws?token={noah}"))
            .await
            .unwrap();
    let (mut lea_socket, _) =
        tokio_tungstenite::connect_async(format!("ws://{addr}/api/ws?token={lea}"))
            .await
            .unwrap();

    let conversation = call(
        &client,
        api("/conversations/direct"),
        Some(mira),
        json!({"username": "noah"}),
    )
    .await;
    let id = conversation["id"].as_str().unwrap();
    call(
        &client,
        api(&format!("/conversations/{id}/messages")),
        Some(mira),
        json!({"kind": "text", "body": "live?"}),
    )
    .await;

    let received = tokio::time::timeout(Duration::from_secs(3), noah_socket.next())
        .await
        .expect("noah gets the message in time")
        .unwrap()
        .unwrap();
    let Message::Text(text) = received else {
        panic!("expected a text frame")
    };
    let event: Value = serde_json::from_str(&text).unwrap();
    assert_eq!(event["type"], "message");
    assert_eq!(event["message"]["body"], "live?");

    let outsider = tokio::time::timeout(Duration::from_millis(300), lea_socket.next()).await;
    assert!(
        outsider.is_err(),
        "lea is not in the chat and must not receive it"
    );
}

#[sqlx::test]
async fn socket_needs_a_valid_token(db: PgPool) {
    let addr = serve(db).await;
    let result = tokio_tungstenite::connect_async(format!("ws://{addr}/api/ws?token=nope")).await;
    assert!(result.is_err());
}
