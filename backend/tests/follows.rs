mod common;

use axum::http::{Method, StatusCode};
use common::TestApp;
use sqlx::PgPool;

#[sqlx::test]
async fn following_shows_up_on_both_profiles(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    let noah = app.register("noah").await;

    assert_eq!(
        app.put("/users/noah/follow", &mira).await.status,
        StatusCode::NO_CONTENT
    );
    app.put("/users/noah/follow", &mira).await;

    let noah_seen_by_mira = app.get("/users/noah", Some(&mira)).await;
    assert_eq!(noah_seen_by_mira.body["counts"]["followers"], 1);
    assert_eq!(noah_seen_by_mira.body["is_following"], true);

    let mira_own = app.get("/users/mira", Some(&mira)).await;
    assert_eq!(mira_own.body["counts"]["following"], 1);
    assert_eq!(mira_own.body["is_self"], true);

    let anonymous = app.get("/users/noah", None).await;
    assert_eq!(anonymous.body["is_following"], false);

    let followers = app.get("/users/noah/followers", None).await;
    assert_eq!(followers.body[0]["username"], "mira");

    app.request(Method::DELETE, "/users/noah/follow", Some(&mira), None)
        .await;
    let after = app.get("/users/noah", Some(&noah)).await;
    assert_eq!(after.body["counts"]["followers"], 0);
}

#[sqlx::test]
async fn cannot_follow_yourself(db: PgPool) {
    let app = TestApp::new(db);
    let mira = app.register("mira").await;
    assert_eq!(
        app.put("/users/mira/follow", &mira).await.status,
        StatusCode::BAD_REQUEST
    );
}

#[sqlx::test]
async fn search_finds_people_by_name(db: PgPool) {
    let app = TestApp::new(db);
    app.register("mira").await;
    app.register("noah").await;
    let found = app.get("/users?q=MI", None).await;
    let names: Vec<_> = found
        .body
        .as_array()
        .unwrap()
        .iter()
        .map(|u| u["username"].clone())
        .collect();
    assert_eq!(names, vec!["mira"]);
}
