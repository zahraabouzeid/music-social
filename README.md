# music-social

A social app around listening history. People bring their plays from Spotify, Apple Music or Last.fm, see their stats, share songs and stats with friends, follow people with similar taste and compete on leaderboards.

The repository holds two parts:

- `backend/` is a Rust server with axum and PostgreSQL. It stores every play in one history, whatever service it came from, and computes stats, the feed, taste matches and leaderboards from there.
- `app/` is an Expo app with Expo Router. The same code runs on iPhone, Android and the web.

## Getting music in

Every source is an adapter that turns its data into plays:

- File imports: Spotify's extended streaming history and account data (JSON) and Apple Music's play activity (CSV). The format is detected from the file.
- Live sync: Last.fm by username and Spotify through its sign-in. A background job fetches new plays every few minutes.

Plays shorter than 30 seconds are skipped, and a play that arrives twice, from an import and a sync for example, is stored once.

## Running it locally

You need Rust, Node.js 22, Python 3 and either Docker or a local PostgreSQL 16.

Start the database:

```sh
docker compose up -d db
```

Start the backend. It applies the database migrations on startup.

```sh
cd backend
cp .env.example .env
set -a; . ./.env; set +a
cargo run
```

Start the app. Press `w` for the web version, or scan the QR code with Expo Go.

```sh
cd app
npm install
cp .env.example .env
npx expo start
```

To see the app with content, fill the database with made-up people, plays and posts:

```sh
python3 scripts/seed_demo.py
```

Then sign in as `mira` with the password `listening123`.

## Live connections

Last.fm and Spotify sync only run when their keys are set in `backend/.env`:

- `LASTFM_API_KEY` from a Last.fm API account.
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from the Spotify developer dashboard. Register `<PUBLIC_API_URL>/api/connections/spotify/callback` as the redirect URI.

Without them, the app offers file imports only. A new Spotify app is limited to five allowlisted users until Spotify grants extended access.

## Checks

```sh
cd backend
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres cargo test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

```sh
cd app
npm run format:check
npm run typecheck
npx expo export --platform web
```

The backend tests create a fresh database per test and mock Last.fm and Spotify, so they never reach the real services.
