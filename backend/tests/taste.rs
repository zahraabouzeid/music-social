mod common;

use common::{TestApp, spotify_export};
use sqlx::PgPool;

async fn listener(app: &TestApp, name: &str, artists: &[&str]) -> String {
    let token = app.register(name).await;
    let entries: Vec<_> = artists
        .iter()
        .enumerate()
        .map(|(i, artist)| (*artist, "Song", "Album", i as i64 % 20))
        .collect();
    let export = spotify_export(&entries);
    app.upload("/imports", &token, export).await;
    token
}

#[sqlx::test]
async fn people_with_similar_taste_are_suggested_first(db: PgPool) {
    let app = TestApp::new(db);
    let mira = listener(
        &app,
        "mira",
        &["Sleep Token", "Spiritbox", "Ghost", "Sleep Token"],
    )
    .await;
    listener(&app, "noah", &["Sleep Token", "Spiritbox", "Ghost"]).await;
    listener(
        &app,
        "lena",
        &[
            "Ghost",
            "Taylor Swift",
            "Olivia Rodrigo",
            "Sabrina Carpenter",
        ],
    )
    .await;
    listener(&app, "omar", &["Bach", "Chopin"]).await;

    let suggestions = app.get("/suggestions", Some(&mira)).await;
    let names: Vec<_> = suggestions
        .body
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s["user"]["username"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(names, vec!["noah", "lena"]);
    assert!(suggestions.body[0]["similarity"].as_f64().unwrap() > 0.9);
    assert_eq!(suggestions.body[0]["shared_artists"][0], "Sleep Token");

    app.put("/users/noah/follow", &mira).await;
    let after = app.get("/suggestions", Some(&mira)).await;
    assert_eq!(after.body[0]["user"]["username"], "lena");
}

#[sqlx::test]
async fn match_reports_score_and_shared_artists(db: PgPool) {
    let app = TestApp::new(db);
    let mira = listener(&app, "mira", &["Sleep Token", "Ghost"]).await;
    listener(&app, "omar", &["Bach"]).await;
    listener(&app, "noah", &["Ghost"]).await;

    let none = app.get("/users/omar/match", Some(&mira)).await;
    assert_eq!(none.body["similarity"], 0.0);

    let some = app.get("/users/noah/match", Some(&mira)).await;
    let score = some.body["similarity"].as_f64().unwrap();
    assert!(score > 0.5 && score < 1.0, "{score}");
    assert_eq!(some.body["shared_artists"][0], "Ghost");
}
