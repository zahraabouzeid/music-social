mod common;

use axum::http::{Method, StatusCode};
use common::{TestApp, spotify_export};
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test]
async fn direct_chat_is_shared_and_counts_unread(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    let noah = app.register("noah").await;

    let opened = app
        .post(
            "/conversations/direct",
            Some(&mira),
            json!({"username": "noah"}),
        )
        .await;
    assert_eq!(opened.status, StatusCode::OK, "{}", opened.body);
    let id = opened.body["id"].as_str().unwrap().to_string();

    let again = app
        .post(
            "/conversations/direct",
            Some(&noah),
            json!({"username": "mira"}),
        )
        .await;
    assert_eq!(again.body["id"], id.as_str());

    let sent = app
        .post(
            &format!("/conversations/{id}/messages"),
            Some(&mira),
            json!({"kind": "text", "body": "hey"}),
        )
        .await;
    assert_eq!(sent.status, StatusCode::CREATED, "{}", sent.body);
    assert_eq!(sent.body["sender"]["username"], "mira");

    let noah_list = app.get("/conversations", Some(&noah)).await;
    assert_eq!(noah_list.body[0]["unread"], 1);
    assert_eq!(noah_list.body[0]["last_message"]["body"], "hey");

    app.request(
        Method::POST,
        &format!("/conversations/{id}/read"),
        Some(&noah),
        None,
    )
    .await;
    let after = app.get("/conversations", Some(&noah)).await;
    assert_eq!(after.body[0]["unread"], 0);

    let mira_list = app.get("/conversations", Some(&mira)).await;
    assert_eq!(mira_list.body[0]["unread"], 0);
}

#[sqlx::test]
async fn outsiders_cannot_read_a_chat(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    app.register("noah").await;
    let lea = app.register("lea").await;
    let opened = app
        .post(
            "/conversations/direct",
            Some(&mira),
            json!({"username": "noah"}),
        )
        .await;
    let id = opened.body["id"].as_str().unwrap();

    let peek = app
        .get(&format!("/conversations/{id}/messages"), Some(&lea))
        .await;
    assert_eq!(peek.status, StatusCode::NOT_FOUND);
    let write = app
        .post(
            &format!("/conversations/{id}/messages"),
            Some(&lea),
            json!({"kind": "text", "body": "hi"}),
        )
        .await;
    assert_eq!(write.status, StatusCode::NOT_FOUND);
}

#[sqlx::test]
async fn group_shares_songs_and_stats(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    let noah = app.register("noah").await;
    app.register("lea").await;
    app.upload(
        "/imports",
        &mira,
        spotify_export(&[("Ghost", "Kaisarion", "Impera", 1)]),
    )
    .await;
    let track_id = app.get("/me/plays", Some(&mira)).await.body[0]["track_id"]
        .as_i64()
        .unwrap();

    let group = app
        .post(
            "/conversations/group",
            Some(&mira),
            json!({"title": "Concert crew", "usernames": ["noah", "lea"]}),
        )
        .await;
    assert_eq!(group.status, StatusCode::CREATED, "{}", group.body);
    assert_eq!(group.body["members"].as_array().unwrap().len(), 3);
    let id = group.body["id"].as_str().unwrap();

    let song = app
        .post(
            &format!("/conversations/{id}/messages"),
            Some(&mira),
            json!({"kind": "track", "track_id": track_id, "body": "for friday"}),
        )
        .await;
    assert_eq!(song.body["track"]["title"], "Kaisarion");

    let stats = app
        .post(
            &format!("/conversations/{id}/messages"),
            Some(&mira),
            json!({"kind": "stats", "period": "week"}),
        )
        .await;
    assert_eq!(stats.body["payload"]["top_artists"][0]["name"], "Ghost");

    let history = app
        .get(&format!("/conversations/{id}/messages"), Some(&noah))
        .await;
    let kinds: Vec<_> = history
        .body
        .as_array()
        .unwrap()
        .iter()
        .map(|m| m["kind"].clone())
        .collect();
    assert_eq!(kinds, vec!["stats", "track"]);
}

#[sqlx::test]
async fn people_can_be_added_to_groups_only(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    app.register("noah").await;
    app.register("lea").await;

    let direct = app
        .post(
            "/conversations/direct",
            Some(&mira),
            json!({"username": "noah"}),
        )
        .await;
    let direct_id = direct.body["id"].as_str().unwrap();
    let refused = app
        .post(
            &format!("/conversations/{direct_id}/members"),
            Some(&mira),
            json!({"username": "lea"}),
        )
        .await;
    assert_eq!(refused.status, StatusCode::BAD_REQUEST);

    let group = app
        .post(
            "/conversations/group",
            Some(&mira),
            json!({"title": "Crew", "usernames": ["noah"]}),
        )
        .await;
    let group_id = group.body["id"].as_str().unwrap();
    let added = app
        .post(
            &format!("/conversations/{group_id}/members"),
            Some(&mira),
            json!({"username": "lea"}),
        )
        .await;
    assert_eq!(added.body["members"].as_array().unwrap().len(), 3);
}
