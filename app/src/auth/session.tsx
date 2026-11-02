import { useQueryClient } from '@tanstack/react-query';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { request } from '@/api/client';
import type { PrivateUser, Session } from '@/api/types';

import { readToken, writeToken } from './tokenStore';

type SessionState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  token: string | null;
  user: PrivateUser | null;
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (fields: { username: string; display_name: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: PrivateUser) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PrivateUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await readToken();
      if (stored) {
        try {
          setUser(await request<PrivateUser>('/me', { token: stored }));
          setToken(stored);
        } catch {
          await writeToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const start = useCallback(async (session: Session) => {
    await writeToken(session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const signIn = useCallback(
    async (login: string, password: string) => {
      await start(await request<Session>('/auth/login', { method: 'POST', json: { login, password } }));
    },
    [start],
  );

  const signUp = useCallback<SessionState['signUp']>(
    async (fields) => {
      await start(await request<Session>('/auth/register', { method: 'POST', json: fields }));
    },
    [start],
  );

  const signOut = useCallback(async () => {
    if (token) await request('/auth/logout', { method: 'POST', token }).catch(() => undefined);
    await writeToken(null);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [token, queryClient]);

  const value = useMemo<SessionState>(
    () => ({
      status: loading ? 'loading' : token ? 'signed-in' : 'signed-out',
      token,
      user,
      signIn,
      signUp,
      signOut,
      setUser,
    }),
    [loading, token, user, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
