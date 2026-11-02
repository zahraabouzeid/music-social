mod common;

use common::TestApp;
use music_social::{
    config::{Config, LastfmConfig},
    connections::{now_playing, repo},
    listening::Service,
    sources::Sources,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, query_param},
};

fn recent(tracks: Value) -> ResponseTemplate {
    ResponseTemplate::new(200)
        .set_body_json(json!({"recenttracks": {"track": tracks, "@attr": {"totalPages": "1"}}}))
}

#[sqlx::test]
async fn chat_members_see_what_others_play_right_now(db: PgPool) {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(query_param("method", "user.getinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"user": {}})))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(query_param("method", "user.getrecenttracks"))
        .and(query_param("limit", "1"))
        .respond_with(recent(json!([
            {"name": "Darkness At The Heart Of My Love", "artist": {"#text": "Ghost"}, "album": {"#text": "Impera"}, "@attr": {"nowplaying": "true"}}
        ])))
        .mount(&server)
        .await;
    let config = Config {
        lastfm: Some(LastfmConfig {
            api_key: "test".into(),
            api_url: format!("{}/2.0/", server.uri()),
        }),
        ..Config::for_tests()
    };
    let sources = Sources::from_config(&config);
    let app = TestApp::with_config(db.clone(), config);
    let mira = app.register("mira").await;
    let noah = app.register("noah").await;
    app.post(
        "/connections/lastfm",
        Some(&mira),
        json!({"username": "mira_fm"}),
    )
    .await;

    let mira_id: uuid::Uuid = sqlx::query_scalar("select id from users where username = 'mira'")
        .fetch_one(&db)
        .await
        .unwrap();
    let connection = repo::find(&db, mira_id, Service::Lastfm).await.unwrap();
    now_playing::refresh(&db, &sources, &connection)
        .await
        .unwrap();

    let profile = app.get("/users/mira/now-playing", None).await;
    assert_eq!(profile.body["title"], "Darkness At The Heart Of My Love");
    assert_eq!(profile.body["service"], "lastfm");

    let chat = app
        .post(
            "/conversations/direct",
            Some(&noah),
            json!({"username": "mira"}),
        )
        .await;
    let id = chat.body["id"].as_str().unwrap();
    let listening = app
        .get(&format!("/conversations/{id}/now-playing"), Some(&noah))
        .await;
    assert_eq!(listening.body[0]["username"], "mira");
    assert_eq!(listening.body[0]["artist"], "Ghost");

    server.reset().await;
    Mock::given(method("GET"))
        .respond_with(recent(json!([
            {"name": "Old", "artist": {"#text": "Ghost"}, "album": {"#text": ""}, "date": {"uts": "1714588800"}}
        ])))
        .mount(&server)
        .await;
    now_playing::refresh(&db, &sources, &connection)
        .await
        .unwrap();
    assert_eq!(
        app.get("/users/mira/now-playing", None).await.body,
        Value::Null
    );
}
