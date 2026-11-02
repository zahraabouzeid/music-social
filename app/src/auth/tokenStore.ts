import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'session-token';

export async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') return safeLocalStorage()?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

export async function writeToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = safeLocalStorage();
    if (token) storage?.setItem(KEY, token);
    else storage?.removeItem(KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
