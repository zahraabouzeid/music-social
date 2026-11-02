import { useQueryClient } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';

import { addMessage, chatKeys } from '@/api/chat';
import { apiUrl } from '@/api/config';
import type { Message } from '@/api/types';
import { useSession } from '@/auth/session';

const MAX_RETRY_MS = 30_000;

type Event = { type: 'message'; message: Message } | { type: 'conversation'; id: string };

export function LiveUpdates({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(`${apiUrl.replace(/^http/, 'ws')}/api/ws?token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempts = 0;
      };
      socket.onmessage = (incoming) => {
        const event = parse(incoming.data);
        if (event?.type === 'message') addMessage(queryClient, event.message);
        if (event) queryClient.invalidateQueries({ queryKey: chatKeys.list });
      };
      socket.onclose = () => {
        if (stopped) return;
        attempts += 1;
        retry = setTimeout(connect, Math.min(MAX_RETRY_MS, 1000 * 2 ** attempts));
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [token, queryClient]);

  return children;
}

function parse(data: unknown): Event | null {
  if (typeof data !== 'string') return null;
  try {
    return JSON.parse(data) as Event;
  } catch {
    return null;
  }
}
