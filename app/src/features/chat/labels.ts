import type { Conversation, Message } from '@/api/types';

export function conversationTitle(conversation: Conversation, myUsername?: string) {
  if (conversation.kind === 'group') return conversation.title ?? 'Group';
  const other = conversation.members.find((member) => member.username !== myUsername);
  return other?.display_name ?? 'Chat';
}

export function conversationAvatar(conversation: Conversation, myUsername?: string) {
  if (conversation.kind === 'group') return { name: conversation.title ?? 'G', seed: conversation.id };
  const other = conversation.members.find((member) => member.username !== myUsername);
  return { name: other?.display_name ?? '?', seed: other?.username ?? conversation.id };
}

export function previewText(preview: NonNullable<Conversation['last_message']>, myUsername?: string) {
  const who = preview.sender_username === myUsername ? 'You' : `@${preview.sender_username}`;
  const what = describe(preview.kind, preview.body);
  return `${who}: ${what}`;
}

function describe(kind: Message['kind'], body: string) {
  if (kind === 'track') return body ? `shared a song, ${body}` : 'shared a song';
  if (kind === 'stats') return body ? `shared stats, ${body}` : 'shared stats';
  return body;
}
