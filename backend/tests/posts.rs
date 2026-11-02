mod common;

use axum::http::{Method, StatusCode};
use common::{TestApp, spotify_export};
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test]
async fn shared_track_appears_in_followers_feed_with_likes(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    let noah = app.register("noah").await;
    app.upload(
        "/imports",
        &mira,
        spotify_export(&[("Sleep Token", "Alkaline", "Take Me Back To Eden", 1)]),
    )
    .await;
    let plays = app.get("/me/plays", Some(&mira)).await;
    let track_id = plays.body[0]["track_id"].as_i64().unwrap();

    let created = app
        .post(
            "/posts",
            Some(&mira),
            json!({"kind": "track", "track_id": track_id, "caption": "on repeat"}),
        )
        .await;
    assert_eq!(created.status, StatusCode::CREATED, "{}", created.body);
    let post_id = created.body["id"].as_str().unwrap().to_string();
    assert_eq!(created.body["track"]["title"], "Alkaline");

    app.put("/users/mira/follow", &noah).await;
    app.put(&format!("/posts/{post_id}/like"), &noah).await;

    let feed = app.get("/feed", Some(&noah)).await;
    assert_eq!(feed.body[0]["id"], post_id.as_str());
    assert_eq!(feed.body[0]["likes"], 1);
    assert_eq!(feed.body[0]["liked_by_me"], true);
    assert_eq!(feed.body[0]["author"]["username"], "mira");
}

#[sqlx::test]
async fn stats_post_snapshots_top_artists(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;

    let empty = app
        .post(
            "/posts",
            Some(&mira),
            json!({"kind": "stats", "period": "week"}),
        )
        .await;
    assert_eq!(empty.status, StatusCode::BAD_REQUEST);

    app.upload(
        "/imports",
        &mira,
        spotify_export(&[
            ("Ghost", "Kaisarion", "Impera", 1),
            ("Ghost", "Spillways", "Impera", 2),
        ]),
    )
    .await;
    let created = app
        .post(
            "/posts",
            Some(&mira),
            json!({"kind": "stats", "period": "week"}),
        )
        .await;
    assert_eq!(created.status, StatusCode::CREATED, "{}", created.body);
    assert_eq!(created.body["payload"]["top_artists"][0]["name"], "Ghost");
    assert_eq!(created.body["payload"]["totals"]["plays"], 2);
}

#[sqlx::test]
async fn only_the_author_can_delete_a_post(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    let noah = app.register("noah").await;
    let created = app
        .post(
            "/posts",
            Some(&mira),
            json!({"kind": "text", "caption": "hello"}),
        )
        .await;
    let path = format!("/posts/{}", created.body["id"].as_str().unwrap());

    assert_eq!(
        app.request(Method::DELETE, &path, Some(&noah), None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        app.request(Method::DELETE, &path, Some(&mira), None)
            .await
            .status,
        StatusCode::NO_CONTENT
    );
    assert_eq!(app.get("/users/mira/posts", None).await.body, json!([]));
}
