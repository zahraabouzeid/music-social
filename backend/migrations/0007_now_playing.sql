create table now_playing (
    user_id uuid primary key references users (id) on delete cascade,
    title text not null,
    artist text not null,
    album text,
    service text not null,
    updated_at timestamptz not null default now()
);
