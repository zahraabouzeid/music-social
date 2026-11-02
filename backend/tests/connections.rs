mod common;

use axum::http::StatusCode;
use common::TestApp;
use music_social::config::{Config, LastfmConfig, SpotifyConfig};
use serde_json::json;
use sqlx::PgPool;
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, path, query_param},
};

async fn app_with_mocks(db: PgPool, server: &MockServer) -> TestApp {
    let config = Config {
        lastfm: Some(LastfmConfig {
            api_key: "test-key".into(),
            api_url: format!("{}/2.0/", server.uri()),
        }),
        spotify: Some(SpotifyConfig {
            client_id: "client".into(),
            client_secret: "secret".into(),
            accounts_url: server.uri(),
            api_url: format!("{}/v1", server.uri()),
        }),
        ..Config::for_tests()
    };
    TestApp::with_config(db, config)
}

#[sqlx::test]
async fn lastfm_connection_syncs_scrobbles(db: PgPool) {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(query_param("method", "user.getinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"user": {"name": "mira"}})))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(query_param("method", "user.getrecenttracks"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "recenttracks": {
                "track": [
                    {"name": "Now Playing", "artist": {"#text": "Live"}, "album": {"#text": ""}, "@attr": {"nowplaying": "true"}},
                    {"name": "Doomed", "artist": {"#text": "Bring Me The Horizon"}, "album": {"#text": "That's The Spirit"}, "date": {"uts": "1714588800"}},
                    {"name": "Throne", "artist": {"#text": "Bring Me The Horizon"}, "album": {"#text": "That's The Spirit"}, "date": {"uts": "1714589100"}}
                ],
                "@attr": {"totalPages": "1"}
            }
        })))
        .mount(&server)
        .await;

    let app = app_with_mocks(db, &server).await;
    let token = app.register("mira").await;

    let connect = app
        .post(
            "/connections/lastfm",
            Some(&token),
            json!({"username": "mira"}),
        )
        .await;
    assert_eq!(connect.status, StatusCode::CREATED, "{}", connect.body);

    let synced = app
        .post("/connections/lastfm/sync", Some(&token), json!({}))
        .await;
    assert_eq!(synced.status, StatusCode::OK, "{}", synced.body);
    assert_eq!(synced.body["plays_added"], 2);

    let list = app.get("/connections", Some(&token)).await;
    assert_eq!(list.body["connected"][0]["service"], "lastfm");
    assert!(list.body["connected"][0]["last_synced_at"].is_string());
}

#[sqlx::test]
async fn unknown_lastfm_user_is_rejected(db: PgPool) {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;
    let app = app_with_mocks(db, &server).await;
    let token = app.register("mira").await;

    let reply = app
        .post(
            "/connections/lastfm",
            Some(&token),
            json!({"username": "ghost"}),
        )
        .await;
    assert_eq!(reply.status, StatusCode::BAD_REQUEST);
}

#[sqlx::test]
async fn spotify_oauth_flow_connects_and_syncs(db: PgPool) {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/token"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "access_token": "access", "refresh_token": "refresh", "expires_in": 3600
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/v1/me"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"id": "spotify-user"})))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/v1/me/player/recently-played"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "items": [{
                "played_at": "2024-06-01T10:00:00.000Z",
                "track": {"name": "Hurricane", "artists": [{"name": "I Prevail"}], "album": {"name": "Trauma"}, "duration_ms": 200000}
            }]
        })))
        .mount(&server)
        .await;

    let app = app_with_mocks(db, &server).await;
    let token = app.register("mira").await;

    let authorize = app
        .get("/connections/spotify/authorize", Some(&token))
        .await;
    let url = authorize.body["url"].as_str().unwrap();
    assert!(url.contains("scope=user-read-recently-played"));
    let state = url.split("state=").nth(1).unwrap();

    let callback = app
        .get(
            &format!("/connections/spotify/callback?code=abc&state={state}"),
            None,
        )
        .await;
    assert_eq!(callback.status, StatusCode::SEE_OTHER);

    let synced = app
        .post("/connections/spotify/sync", Some(&token), json!({}))
        .await;
    assert_eq!(synced.body["plays_added"], 1, "{}", synced.body);
}
