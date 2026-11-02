create table users (
    id uuid primary key default gen_random_uuid(),
    username text not null check (username ~ '^[a-z0-9_.]{3,30}$'),
    display_name text not null check (char_length(display_name) between 1 and 50),
    email text not null,
    password_hash text not null,
    bio text not null default '' check (char_length(bio) <= 280),
    created_at timestamptz not null default now()
);

create unique index users_username_key on users (username);
create unique index users_email_key on users (lower(email));

create table sessions (
    token_hash bytea primary key,
    user_id uuid not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create index sessions_user_id_idx on sessions (user_id);
