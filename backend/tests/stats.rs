mod common;

use axum::http::StatusCode;
use common::{TestApp, spotify_export};
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test]
async fn stats_rank_artists_tracks_and_albums_by_period(db: PgPool) {
    let app = TestApp::new(db);
    let token = app.register("mira").await;
    let export = spotify_export(&[
        ("Sleep Token", "Alkaline", "Take Me Back To Eden", 1),
        ("Sleep Token", "Granite", "Take Me Back To Eden", 2),
        ("Sleep Token", "Alkaline", "Take Me Back To Eden", 3),
        ("Spiritbox", "Holy Roller", "Eternal Blue", 4),
        ("Ghost", "Kaisarion", "Impera", 100),
    ]);
    app.upload("/imports", &token, export).await;

    let week = app.get("/users/mira/stats?period=week", None).await;
    assert_eq!(week.status, StatusCode::OK, "{}", week.body);
    assert_eq!(week.body["period"], "week");
    assert_eq!(week.body["totals"]["plays"], 4);
    assert_eq!(week.body["totals"]["artists"], 2);
    assert_eq!(week.body["totals"]["minutes"], 12);
    assert_eq!(
        week.body["top_artists"][0],
        json!({"name": "Sleep Token", "plays": 3})
    );
    assert_eq!(week.body["top_tracks"][0]["title"], "Alkaline");
    assert_eq!(week.body["top_albums"][0]["name"], "Take Me Back To Eden");

    let all = app.get("/users/mira/stats?period=all", None).await;
    assert_eq!(all.body["totals"]["plays"], 5);
}
