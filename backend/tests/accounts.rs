mod common;

use axum::http::{Method, StatusCode};
use common::TestApp;
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test]
async fn register_then_read_own_account(db: PgPool) {
    let app = TestApp::new(db);
    let token = app.register("Mira").await;

    let me = app.get("/me", Some(&token)).await;
    assert_eq!(me.status, StatusCode::OK);
    assert_eq!(me.body["username"], "mira");
    assert_eq!(me.body["email"], "Mira@example.com");
}

#[sqlx::test]
async fn duplicate_username_is_rejected(db: PgPool) {
    let app = TestApp::new(db);
    app.register("mira").await;
    let reply = app
        .post(
            "/auth/register",
            None,
            json!({"username": "MIRA", "display_name": "x", "email": "other@example.com", "password": "12345678"}),
        )
        .await;
    assert_eq!(reply.status, StatusCode::CONFLICT);
    assert_eq!(reply.body["error"], "username is taken");
}

#[sqlx::test]
async fn login_with_email_or_username(db: PgPool) {
    let app = TestApp::new(db);
    app.register("mira").await;

    for login in ["mira", "MIRA@example.com"] {
        let reply = app
            .post(
                "/auth/login",
                None,
                json!({"login": login, "password": "correct horse battery"}),
            )
            .await;
        assert_eq!(reply.status, StatusCode::OK, "{login}");
    }

    let wrong = app
        .post(
            "/auth/login",
            None,
            json!({"login": "mira", "password": "wrong password"}),
        )
        .await;
    assert_eq!(wrong.status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
async fn logout_ends_the_session(db: PgPool) {
    let app = TestApp::new(db);
    let token = app.register("mira").await;

    let reply = app
        .request(Method::POST, "/auth/logout", Some(&token), None)
        .await;
    assert_eq!(reply.status, StatusCode::NO_CONTENT);
    assert_eq!(
        app.get("/me", Some(&token)).await.status,
        StatusCode::UNAUTHORIZED
    );
}

#[sqlx::test]
async fn profile_update_is_visible_publicly(db: PgPool) {
    let app = TestApp::new(db);
    let token = app.register("mira").await;

    let reply = app
        .request(
            Method::PATCH,
            "/me",
            Some(&token),
            Some(json!({"bio": "metal and more"})),
        )
        .await;
    assert_eq!(reply.status, StatusCode::OK);

    let profile = app.get("/users/mira", None).await;
    assert_eq!(profile.body["bio"], "metal and more");
    assert!(profile.body.get("email").is_none());
}
