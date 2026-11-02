import datetime as dt
import json
import random
import sys
import urllib.error
import urllib.request

API = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/api"
PASSWORD = "listening123"

CATALOG = {
    "Sleep Token": ("Take Me Back To Eden", ["Alkaline", "The Summoning", "Granite", "Vore", "Euclid"]),
    "Spiritbox": ("Eternal Blue", ["Holy Roller", "Circle With Me", "Secret Garden"]),
    "Ghost": ("Impera", ["Kaisarion", "Spillways", "Darkness At The Heart Of My Love"]),
    "Bring Me The Horizon": ("That's The Spirit", ["Throne", "Drown", "Doomed"]),
    "Taylor Swift": ("Midnights", ["Anti-Hero", "Lavender Haze", "Karma"]),
    "Olivia Rodrigo": ("GUTS", ["vampire", "bad idea right?", "get him back!"]),
    "Lorna Shore": ("Pain Remains", ["Pain Remains I", "Into The Earth"]),
    "Phoebe Bridgers": ("Punisher", ["Kyoto", "Garden Song", "Motion Sickness"]),
}

PEOPLE = {
    "mira": ("Mira", ["Sleep Token", "Spiritbox", "Ghost", "Lorna Shore", "Bring Me The Horizon"]),
    "noah": ("Noah", ["Sleep Token", "Ghost", "Spiritbox", "Phoebe Bridgers"]),
    "jonas": ("Jonas", ["Bring Me The Horizon", "Lorna Shore", "Sleep Token"]),
    "lea": ("Lea", ["Taylor Swift", "Olivia Rodrigo", "Phoebe Bridgers"]),
    "malik": ("Malik", ["Ghost", "Taylor Swift", "Spiritbox"]),
}

FOLLOWS = [("mira", "noah"), ("noah", "mira"), ("mira", "jonas"), ("lea", "mira"), ("jonas", "mira"), ("malik", "mira")]


def call(method, path, token=None, body=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    request = urllib.request.Request(API + path, data=data, method=method)
    if token:
        request.add_header("Authorization", "Bearer " + token)
    if body is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request) as response:
            text = response.read()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as err:
        raise SystemExit(f"{method} {path} failed with {err.code}: {err.read().decode()}")


def listening_history(favourites, now):
    plays = []
    for day in range(120):
        for _ in range(random.randint(0, 14 if day < 30 else 6)):
            artist = random.choices(favourites, weights=range(len(favourites), 0, -1))[0]
            album, songs = CATALOG[artist]
            song = random.choices(songs, weights=range(len(songs), 0, -1))[0]
            played_at = now - dt.timedelta(days=day, minutes=random.randint(0, 1400))
            plays.append(
                {
                    "ts": played_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "ms_played": random.randint(150_000, 280_000),
                    "master_metadata_track_name": song,
                    "master_metadata_album_artist_name": artist,
                    "master_metadata_album_album_name": album,
                }
            )
    return plays


def main():
    random.seed(7)
    now = dt.datetime.now(dt.timezone.utc)
    tokens = {}
    for username, (name, favourites) in PEOPLE.items():
        session = call(
            "POST",
            "/auth/register",
            body={"username": username, "display_name": name, "email": f"{username}@example.com", "password": PASSWORD},
        )
        tokens[username] = session["token"]
        imported = call("POST", "/imports", tokens[username], raw=json.dumps(listening_history(favourites, now)).encode())
        print(f"{username}: {imported['plays_added']} plays")

    for follower, followee in FOLLOWS:
        call("PUT", f"/users/{followee}/follow", tokens[follower])

    call("PATCH", "/me", tokens["mira"], {"bio": "Metal, mostly."})
    recent = call("GET", "/me/plays?limit=1", tokens["noah"])
    call("POST", "/posts", tokens["noah"], {"kind": "track", "track_id": recent[0]["track_id"], "caption": "this bridge though"})
    call("POST", "/posts", tokens["jonas"], {"kind": "stats", "period": "week", "caption": "heavy week"})
    note = call("POST", "/posts", tokens["mira"], {"kind": "text", "caption": "Who is going to the next Ghost show?"})
    for liker in ["noah", "jonas"]:
        call("PUT", f"/posts/{note['id']}/like", tokens[liker])
    call("POST", "/posts", tokens["lea"], {"kind": "text", "caption": "Phoebe Bridgers for rainy Mondays."})

    print(f"Demo users are ready: {', '.join(PEOPLE)}. The password for all of them is {PASSWORD}.")


if __name__ == "__main__":
    main()
