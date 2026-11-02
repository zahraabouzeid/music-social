create table tracks (
    id bigserial primary key,
    identity_key text not null unique,
    title text not null,
    artist text not null,
    album text,
    created_at timestamptz not null default now()
);

create index tracks_artist_idx on tracks (lower(artist));

create table listens (
    user_id uuid not null references users (id) on delete cascade,
    track_id bigint not null references tracks (id),
    played_at timestamptz not null,
    ms_played integer,
    service text not null,
    primary key (user_id, played_at, track_id)
);

create index listens_track_idx on listens (track_id, played_at);
create index listens_played_at_idx on listens (played_at);

create table imports (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    service text not null,
    plays_found integer not null,
    plays_added integer not null,
    created_at timestamptz not null default now()
);

create index imports_user_idx on imports (user_id, created_at desc);
