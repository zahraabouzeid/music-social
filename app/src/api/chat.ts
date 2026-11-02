import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/auth/session';

import { request } from './client';
import type { Conversation, Listening, Message, NewMessage } from './types';

const NOW_PLAYING_REFRESH_MS = 30_000;

export const chatKeys = {
  list: ['conversations'] as const,
  detail: (id: string) => ['conversation', id] as const,
  messages: (id: string) => ['messages', id] as const,
  nowPlaying: (id: string) => ['now-playing', 'conversation', id] as const,
};

export function useConversations() {
  const { token } = useSession();
  return useQuery({
    queryKey: chatKeys.list,
    queryFn: () => request<Conversation[]>('/conversations', { token }),
  });
}

export function useConversation(id: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: chatKeys.detail(id),
    queryFn: () => request<Conversation>(`/conversations/${id}`, { token }),
  });
}

export function useMessages(id: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: chatKeys.messages(id),
    queryFn: () => request<Message[]>(`/conversations/${id}/messages?limit=100`, { token }),
  });
}

export function useSendMessage(id: string) {
  const { token } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: NewMessage) =>
      request<Message>(`/conversations/${id}/messages`, { method: 'POST', json: message, token }),
    onSuccess: (message) => {
      addMessage(queryClient, message);
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useMarkRead(id: string) {
  const { token } = useSession();
  const queryClient = useQueryClient();
  return () =>
    request(`/conversations/${id}/read`, { method: 'POST', token })
      .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.list }))
      .catch(() => undefined);
}

export function useOpenDirect() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      request<Conversation>('/conversations/direct', { method: 'POST', json: { username }, token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.list }),
  });
}

export function useCreateGroup() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: { title: string; usernames: string[] }) =>
      request<Conversation>('/conversations/group', { method: 'POST', json: group, token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.list }),
  });
}

export function useChatNowPlaying(id: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: chatKeys.nowPlaying(id),
    queryFn: () => request<Listening[]>(`/conversations/${id}/now-playing`, { token }),
    refetchInterval: NOW_PLAYING_REFRESH_MS,
  });
}

export function useUserNowPlaying(username: string) {
  return useQuery({
    queryKey: ['now-playing', 'user', username],
    queryFn: () => request<Listening | null>(`/users/${username}/now-playing`),
    refetchInterval: NOW_PLAYING_REFRESH_MS,
  });
}

export function addMessage(queryClient: ReturnType<typeof useQueryClient>, message: Message) {
  queryClient.setQueryData<Message[]>(chatKeys.messages(message.conversation_id), (messages) => {
    if (!messages) return messages;
    if (messages.some((existing) => existing.id === message.id)) return messages;
    return [message, ...messages];
  });
}
