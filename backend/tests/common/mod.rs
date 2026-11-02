#![allow(dead_code)]

use axum::{
    Router,
    body::Body,
    http::{Method, Request, StatusCode, header},
};
use http_body_util::BodyExt;
use music_social::{app, config::Config};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

pub struct TestApp {
    router: Router,
}

pub struct Reply {
    pub status: StatusCode,
    pub body: Value,
}

impl TestApp {
    pub fn new(db: PgPool) -> Self {
        Self::with_config(db, Config::for_tests())
    }

    pub fn with_config(db: PgPool, config: Config) -> Self {
        Self {
            router: app::router(app::AppState::new(db, config)),
        }
    }

    pub async fn request(
        &self,
        method: Method,
        path: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> Reply {
        let mut builder = Request::builder().method(method).uri(format!("/api{path}"));
        if let Some(token) = token {
            builder = builder.header(header::AUTHORIZATION, format!("Bearer {token}"));
        }
        let request = match body {
            Some(body) => builder
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(body.to_string())),
            None => builder.body(Body::empty()),
        }
        .unwrap();
        self.send(request).await
    }

    pub async fn send(&self, request: Request<Body>) -> Reply {
        let response = self.router.clone().oneshot(request).await.unwrap();
        let status = response.status();
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        Reply { status, body }
    }

    pub async fn upload(&self, path: &str, token: &str, bytes: Vec<u8>) -> Reply {
        let request = Request::builder()
            .method(Method::POST)
            .uri(format!("/api{path}"))
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .header(header::CONTENT_TYPE, "application/octet-stream")
            .body(Body::from(bytes))
            .unwrap();
        self.send(request).await
    }

    pub async fn get(&self, path: &str, token: Option<&str>) -> Reply {
        self.request(Method::GET, path, token, None).await
    }

    pub async fn post(&self, path: &str, token: Option<&str>, body: Value) -> Reply {
        self.request(Method::POST, path, token, Some(body)).await
    }

    pub async fn register(&self, username: &str) -> String {
        let reply = self
            .post(
                "/auth/register",
                None,
                json!({
                    "username": username,
                    "display_name": username,
                    "email": format!("{username}@example.com"),
                    "password": "correct horse battery",
                }),
            )
            .await;
        assert_eq!(reply.status, StatusCode::CREATED, "{}", reply.body);
        reply.body["token"].as_str().unwrap().to_string()
    }
}
