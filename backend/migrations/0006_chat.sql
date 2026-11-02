create table conversations (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in ('direct', 'group')),
    title text check (title is null or char_length(title) between 1 and 60),
    direct_key text unique,
    created_by uuid not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    check ((kind = 'direct') = (direct_key is not null))
);

create table conversation_members (
    conversation_id uuid not null references conversations (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    joined_at timestamptz not null default now(),
    last_read_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on conversation_members (user_id);

create table messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations (id) on delete cascade,
    sender_id uuid not null references users (id) on delete cascade,
    kind text not null check (kind in ('text', 'track', 'stats')),
    body text not null default '' check (char_length(body) <= 2000),
    track_id bigint references tracks (id),
    payload jsonb,
    created_at timestamptz not null default clock_timestamp(),
    check (kind <> 'track' or track_id is not null)
);

create index messages_conversation_idx on messages (conversation_id, created_at desc);
