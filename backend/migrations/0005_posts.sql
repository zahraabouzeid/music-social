create table posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    kind text not null check (kind in ('track', 'stats', 'text')),
    track_id bigint references tracks (id),
    payload jsonb,
    caption text not null default '' check (char_length(caption) <= 500),
    created_at timestamptz not null default now(),
    check (kind <> 'track' or track_id is not null)
);

create index posts_user_idx on posts (user_id, created_at desc);
create index posts_created_idx on posts (created_at desc);

create table likes (
    post_id uuid not null references posts (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);
