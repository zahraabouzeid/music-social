mod common;

use common::{TestApp, spotify_export};
use sqlx::PgPool;

async fn listener(app: &TestApp, name: &str, plays: usize, artist: &str) -> String {
    let token = app.register(name).await;
    let titles: Vec<String> = (0..plays).map(|i| format!("Song {i}")).collect();
    let entries: Vec<_> = titles
        .iter()
        .map(|title| (artist, title.as_str(), "Album", 1))
        .collect();
    app.upload("/imports", &token, spotify_export(&entries))
        .await;
    token
}

fn names(body: &serde_json::Value) -> Vec<String> {
    body["entries"]
        .as_array()
        .unwrap()
        .iter()
        .map(|entry| entry["username"].as_str().unwrap().to_string())
        .collect()
}

#[sqlx::test]
async fn following_board_only_shows_people_you_follow(db: PgPool) {
    let app = TestApp::new(db);
    let mira = listener(&app, "mira", 3, "Ghost").await;
    listener(&app, "noah", 5, "Ghost").await;
    listener(&app, "lena", 9, "Spiritbox").await;
    app.put("/users/noah/follow", &mira).await;

    let following = app.get("/leaderboards?period=week", Some(&mira)).await;
    assert_eq!(names(&following.body), vec!["noah", "mira"]);
    assert_eq!(following.body["entries"][0]["rank"], 1);
    assert_eq!(following.body["entries"][0]["minutes"], 15);

    let global = app
        .get("/leaderboards?scope=global&period=week", Some(&mira))
        .await;
    assert_eq!(names(&global.body), vec!["lena", "noah", "mira"]);

    let ghost = app
        .get("/leaderboards?scope=global&artist=ghost", Some(&mira))
        .await;
    assert_eq!(names(&ghost.body), vec!["noah", "mira"]);
}
