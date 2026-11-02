import { apiUrl } from './config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  json?: unknown;
  body?: BodyInit;
};

export async function request<T>(path: string, { method = 'GET', token, json, body }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch {
    throw new ApiError(0, 'The server cannot be reached. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, capitalize(message));
  }
  return payload as T;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
