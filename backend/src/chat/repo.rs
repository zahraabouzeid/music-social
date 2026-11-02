use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use super::{Conversation, Member, Message, NewMessage, Preview, TrackRef};
use crate::error::{AppError, AppResult};

pub const MAX_GROUP_SIZE: usize = 50;

#[derive(sqlx::FromRow)]
struct ConversationRow {
    id: Uuid,
    kind: String,
    title: Option<String>,
    created_at: DateTime<Utc>,
    unread: i64,
    last_kind: Option<String>,
    last_body: Option<String>,
    last_sender: Option<String>,
    last_at: Option<DateTime<Utc>>,
}

#[derive(sqlx::FromRow)]
struct MemberRow {
    conversation_id: Uuid,
    id: Uuid,
    username: String,
    display_name: String,
}

#[derive(sqlx::FromRow)]
struct MessageRow {
    id: Uuid,
    conversation_id: Uuid,
    kind: String,
    body: String,
    payload: Option<Value>,
    created_at: DateTime<Utc>,
    sender_id: Uuid,
    sender_username: String,
    sender_display_name: String,
    track_id: Option<i64>,
    track_title: Option<String>,
    track_artist: Option<String>,
    track_album: Option<String>,
}

impl From<MessageRow> for Message {
    fn from(row: MessageRow) -> Self {
        let track = match (row.track_id, row.track_title, row.track_artist) {
            (Some(id), Some(title), Some(artist)) => Some(TrackRef {
                id,
                title,
                artist,
                album: row.track_album,
            }),
            _ => None,
        };
        Self {
            id: row.id,
            conversation_id: row.conversation_id,
            kind: row.kind,
            body: row.body,
            payload: row.payload,
            track,
            sender: Member {
                id: row.sender_id,
                username: row.sender_username,
                display_name: row.sender_display_name,
            },
            created_at: row.created_at,
        }
    }
}

macro_rules! select_messages {
    () => {
        "select m.id, m.conversation_id, m.kind, m.body, m.payload, m.created_at,
                u.id as sender_id, u.username as sender_username, u.display_name as sender_display_name,
                t.id as track_id, t.title as track_title, t.artist as track_artist, t.album as track_album
         from messages m
         join users u on u.id = m.sender_id
         left join tracks t on t.id = m.track_id"
    };
}

pub async fn open_direct(db: &PgPool, me: Uuid, other: Uuid) -> AppResult<Uuid> {
    if me == other {
        return Err(AppError::BadRequest(
            "you cannot start a chat with yourself".into(),
        ));
    }
    let key = if me < other {
        format!("{me}:{other}")
    } else {
        format!("{other}:{me}")
    };
    let mut tx = db.begin().await?;
    sqlx::query(
        "insert into conversations (kind, direct_key, created_by) values ('direct', $1, $2)
         on conflict (direct_key) do nothing",
    )
    .bind(&key)
    .bind(me)
    .execute(&mut *tx)
    .await?;
    let id: Uuid = sqlx::query_scalar("select id from conversations where direct_key = $1")
        .bind(&key)
        .fetch_one(&mut *tx)
        .await?;
    sqlx::query(
        "insert into conversation_members (conversation_id, user_id)
         select $1, unnest($2::uuid[]) on conflict do nothing",
    )
    .bind(id)
    .bind(vec![me, other])
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(id)
}

pub async fn create_group(
    db: &PgPool,
    creator: Uuid,
    title: &str,
    members: &[Uuid],
) -> AppResult<Uuid> {
    let mut everyone: Vec<Uuid> = members.to_vec();
    everyone.push(creator);
    everyone.sort();
    everyone.dedup();
    if everyone.len() < 2 {
        return Err(AppError::BadRequest("add at least one other person".into()));
    }
    if everyone.len() > MAX_GROUP_SIZE {
        return Err(AppError::BadRequest(format!(
            "a group can have at most {MAX_GROUP_SIZE} people"
        )));
    }
    let mut tx = db.begin().await?;
    let id: Uuid = sqlx::query_scalar(
        "insert into conversations (kind, title, created_by) values ('group', $1, $2) returning id",
    )
    .bind(title)
    .bind(creator)
    .fetch_one(&mut *tx)
    .await?;
    sqlx::query(
        "insert into conversation_members (conversation_id, user_id) select $1, unnest($2::uuid[])",
    )
    .bind(id)
    .bind(&everyone)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(id)
}

pub async fn add_member(db: &PgPool, conversation: Uuid, user: Uuid) -> AppResult<()> {
    let kind: String = sqlx::query_scalar("select kind from conversations where id = $1")
        .bind(conversation)
        .fetch_one(db)
        .await?;
    if kind != "group" {
        return Err(AppError::BadRequest(
            "people can only be added to groups".into(),
        ));
    }
    let size: i64 =
        sqlx::query_scalar("select count(*) from conversation_members where conversation_id = $1")
            .bind(conversation)
            .fetch_one(db)
            .await?;
    if size as usize >= MAX_GROUP_SIZE {
        return Err(AppError::BadRequest(format!(
            "a group can have at most {MAX_GROUP_SIZE} people"
        )));
    }
    sqlx::query("insert into conversation_members (conversation_id, user_id) values ($1, $2) on conflict do nothing")
        .bind(conversation)
        .bind(user)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn leave(db: &PgPool, conversation: Uuid, user: Uuid) -> AppResult<()> {
    sqlx::query("delete from conversation_members where conversation_id = $1 and user_id = $2")
        .bind(conversation)
        .bind(user)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn ensure_member(db: &PgPool, conversation: Uuid, user: Uuid) -> AppResult<()> {
    let member: bool = sqlx::query_scalar(
        "select exists(select 1 from conversation_members where conversation_id = $1 and user_id = $2)",
    )
    .bind(conversation)
    .bind(user)
    .fetch_one(db)
    .await?;
    if member {
        Ok(())
    } else {
        Err(AppError::NotFound("conversation"))
    }
}

pub async fn member_ids(db: &PgPool, conversation: Uuid) -> AppResult<Vec<Uuid>> {
    Ok(
        sqlx::query_scalar("select user_id from conversation_members where conversation_id = $1")
            .bind(conversation)
            .fetch_all(db)
            .await?,
    )
}

pub async fn list(db: &PgPool, user: Uuid) -> AppResult<Vec<Conversation>> {
    let rows = sqlx::query_as::<_, ConversationRow>(
        "select c.id, c.kind, c.title, c.created_at,
                (select count(*) from messages m
                 where m.conversation_id = c.id and m.created_at > me.last_read_at and m.sender_id <> $1) as unread,
                last.kind as last_kind, last.body as last_body, last.username as last_sender, last.created_at as last_at
         from conversation_members me
         join conversations c on c.id = me.conversation_id
         left join lateral (
             select m.kind, m.body, u.username, m.created_at
             from messages m join users u on u.id = m.sender_id
             where m.conversation_id = c.id
             order by m.created_at desc
             limit 1
         ) last on true
         where me.user_id = $1
         order by coalesce(last.created_at, c.created_at) desc",
    )
    .bind(user)
    .fetch_all(db)
    .await?;
    let ids: Vec<Uuid> = rows.iter().map(|row| row.id).collect();
    let mut members = members_of(db, &ids).await?;
    Ok(rows
        .into_iter()
        .map(|row| Conversation {
            members: members.remove(&row.id).unwrap_or_default(),
            last_message: match (row.last_kind, row.last_body, row.last_sender, row.last_at) {
                (Some(kind), Some(body), Some(sender_username), Some(created_at)) => {
                    Some(Preview {
                        kind,
                        body,
                        sender_username,
                        created_at,
                    })
                }
                _ => None,
            },
            id: row.id,
            kind: row.kind,
            title: row.title,
            unread: row.unread,
            created_at: row.created_at,
        })
        .collect())
}

pub async fn find(db: &PgPool, conversation: Uuid, user: Uuid) -> AppResult<Conversation> {
    list(db, user)
        .await?
        .into_iter()
        .find(|item| item.id == conversation)
        .ok_or(AppError::NotFound("conversation"))
}

async fn members_of(db: &PgPool, conversations: &[Uuid]) -> AppResult<HashMap<Uuid, Vec<Member>>> {
    let rows = sqlx::query_as::<_, MemberRow>(
        "select cm.conversation_id, u.id, u.username, u.display_name
         from conversation_members cm join users u on u.id = cm.user_id
         where cm.conversation_id = any($1)
         order by cm.joined_at, u.username",
    )
    .bind(conversations)
    .fetch_all(db)
    .await?;
    let mut grouped: HashMap<Uuid, Vec<Member>> = HashMap::new();
    for row in rows {
        grouped
            .entry(row.conversation_id)
            .or_default()
            .push(Member {
                id: row.id,
                username: row.username,
                display_name: row.display_name,
            });
    }
    Ok(grouped)
}

pub async fn messages(
    db: &PgPool,
    conversation: Uuid,
    before: Option<DateTime<Utc>>,
    limit: i64,
) -> AppResult<Vec<Message>> {
    let rows = sqlx::query_as::<_, MessageRow>(concat!(
        select_messages!(),
        " where m.conversation_id = $1 and ($2::timestamptz is null or m.created_at < $2)
          order by m.created_at desc
          limit $3"
    ))
    .bind(conversation)
    .bind(before)
    .bind(limit)
    .fetch_all(db)
    .await?;
    Ok(rows.into_iter().map(Into::into).collect())
}

pub async fn send(
    db: &PgPool,
    conversation: Uuid,
    sender: Uuid,
    message: NewMessage,
) -> AppResult<Message> {
    let (kind, track_id, payload, body) = match message {
        NewMessage::Text { body } => ("text", None, None, body),
        NewMessage::Track { track_id, body } => ("track", Some(track_id), None, body),
        NewMessage::Stats { payload, body } => ("stats", None, Some(payload), body),
    };
    let id: Uuid = sqlx::query_scalar(
        "insert into messages (conversation_id, sender_id, kind, track_id, payload, body)
         values ($1, $2, $3, $4, $5, $6) returning id",
    )
    .bind(conversation)
    .bind(sender)
    .bind(kind)
    .bind(track_id)
    .bind(payload)
    .bind(body)
    .fetch_one(db)
    .await
    .map_err(|err| match &err {
        sqlx::Error::Database(db_err) if db_err.is_foreign_key_violation() => {
            AppError::NotFound("track")
        }
        _ => err.into(),
    })?;
    mark_read(db, conversation, sender).await?;
    let row = sqlx::query_as::<_, MessageRow>(concat!(select_messages!(), " where m.id = $1"))
        .bind(id)
        .fetch_one(db)
        .await?;
    Ok(row.into())
}

pub async fn mark_read(db: &PgPool, conversation: Uuid, user: Uuid) -> AppResult<()> {
    sqlx::query(
        "update conversation_members set last_read_at = clock_timestamp()
         where conversation_id = $1 and user_id = $2",
    )
    .bind(conversation)
    .bind(user)
    .execute(db)
    .await?;
    Ok(())
}
