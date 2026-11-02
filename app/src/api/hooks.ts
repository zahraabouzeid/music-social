import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/auth/session';

import { request } from './client';
import type {
  Board,
  Connections,
  ImportRecord,
  NewPost,
  Period,
  Post,
  PrivateUser,
  Profile,
  PublicUser,
  RecentPlay,
  Scope,
  Stats,
  Suggestion,
  TasteMatch,
} from './types';

function useToken() {
  return useSession().token;
}

export function useProfile(username: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => request<Profile>(`/users/${username}`, { token }),
  });
}

export function useStats(username: string, period: Period) {
  return useQuery({
    queryKey: ['stats', username, period],
    queryFn: () => request<Stats>(`/users/${username}/stats?period=${period}`),
  });
}

export function useUserPosts(username: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['posts', username],
    queryFn: () => request<Post[]>(`/users/${username}/posts`, { token }),
  });
}

export function useMatch(username: string, enabled: boolean) {
  const token = useToken();
  return useQuery({
    queryKey: ['match', username],
    queryFn: () => request<TasteMatch>(`/users/${username}/match`, { token }),
    enabled,
  });
}

export function useFollow(username: string) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) =>
      request(`/users/${username}/follow`, { method: follow ? 'PUT' : 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export function useFeed() {
  const token = useToken();
  return useQuery({ queryKey: ['feed'], queryFn: () => request<Post[]>('/feed', { token }) });
}

export function useRecentPlays(limit = 30) {
  const token = useToken();
  return useQuery({
    queryKey: ['plays', limit],
    queryFn: () => request<RecentPlay[]>(`/me/plays?limit=${limit}`, { token }),
  });
}

export function useCreatePost() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: NewPost) => request<Post>('/posts', { method: 'POST', json: post, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useLike() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, like }: { id: string; like: boolean }) =>
      request(`/posts/${id}/like`, { method: like ? 'PUT' : 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useDeletePost() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/posts/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useSuggestions() {
  const token = useToken();
  return useQuery({ queryKey: ['suggestions'], queryFn: () => request<Suggestion[]>('/suggestions', { token }) });
}

export function useUserSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => request<PublicUser[]>(`/users?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length >= 2,
  });
}

export function useBoard(scope: Scope, period: Period, artist: string) {
  const token = useToken();
  const name = artist.trim();
  const query = `scope=${scope}&period=${period}${name ? `&artist=${encodeURIComponent(name)}` : ''}`;
  return useQuery({
    queryKey: ['board', scope, period, name],
    queryFn: () => request<Board>(`/leaderboards?${query}`, { token }),
  });
}

export function useImports() {
  const token = useToken();
  return useQuery({ queryKey: ['imports'], queryFn: () => request<ImportRecord[]>('/imports', { token }) });
}

export function useConnections() {
  const token = useToken();
  return useQuery({ queryKey: ['connections'], queryFn: () => request<Connections>('/connections', { token }) });
}

export function useInvalidateListening() {
  const queryClient = useQueryClient();
  return () =>
    ['imports', 'connections', 'stats', 'plays', 'profile', 'board', 'suggestions'].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    );
}

export function useUpdateProfile() {
  const { token, setUser } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: { display_name?: string; bio?: string }) =>
      request<PrivateUser>('/me', { method: 'PATCH', json: fields, token }),
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
    },
  });
}
