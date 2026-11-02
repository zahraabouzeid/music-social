create table connections (
    user_id uuid not null references users (id) on delete cascade,
    service text not null,
    external_id text not null,
    access_token text,
    refresh_token text,
    token_expires_at timestamptz,
    synced_until timestamptz,
    last_synced_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    primary key (user_id, service)
);

create index connections_due_idx on connections (last_synced_at nulls first);

create table oauth_states (
    state text primary key,
    user_id uuid not null references users (id) on delete cascade,
    created_at timestamptz not null default now()
);
