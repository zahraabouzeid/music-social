mod common;

use axum::http::StatusCode;
use common::TestApp;
use sqlx::PgPool;

const SPOTIFY: &[u8] = include_bytes!("fixtures/spotify_extended.json");

#[sqlx::test]
async fn spotify_export_is_imported_once(db: PgPool) {
    let app = TestApp::new(db);
    let token = app.register("mira").await;

    let first = app.upload("/imports", &token, SPOTIFY.to_vec()).await;
    assert_eq!(first.status, StatusCode::CREATED, "{}", first.body);
    assert_eq!(first.body["service"], "spotify");
    assert_eq!(first.body["plays_found"], 3);
    assert_eq!(first.body["plays_added"], 3);

    let again = app.upload("/imports", &token, SPOTIFY.to_vec()).await;
    assert_eq!(again.body["plays_added"], 0);

    let plays = app.get("/me/plays?limit=10", Some(&token)).await;
    let plays = plays.body.as_array().unwrap();
    assert_eq!(plays.len(), 3);
    assert_eq!(plays[0]["title"], "Holy Roller");

    let imports = app.get("/imports", Some(&token)).await;
    assert_eq!(imports.body.as_array().unwrap().len(), 2);
}

#[sqlx::test]
async fn unknown_files_are_rejected_with_a_reason(db: PgPool) {
    let app = TestApp::new(db);
    let token = app.register("mira").await;

    let reply = app
        .upload("/imports", &token, b"hello world".to_vec())
        .await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
    assert_eq!(
        reply.body["error"],
        "this file is not a supported listening history export"
    );
}

#[sqlx::test]
async fn same_song_from_two_users_is_one_track(db: PgPool) {
    let app = TestApp::new(db.clone());
    for name in ["mira", "noah"] {
        let token = app.register(name).await;
        app.upload("/imports", &token, SPOTIFY.to_vec()).await;
    }
    let tracks: i64 = sqlx::query_scalar("select count(*) from tracks")
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(tracks, 3);
}
