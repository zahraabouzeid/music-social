import * as DocumentPicker from 'expo-document-picker';

import { request } from '@/api/client';
import type { ImportRecord } from '@/api/types';

export type FileResult = { name: string; record?: ImportRecord; error?: string };

export async function pickAndImport(token: string | null, onProgress: (result: FileResult) => void) {
  const picked = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
  });
  if (picked.canceled) return;

  for (const asset of picked.assets) {
    try {
      const body = asset.file ?? (await (await fetch(asset.uri)).blob());
      const record = await request<ImportRecord>('/imports', { method: 'POST', token, body });
      onProgress({ name: asset.name, record });
    } catch (err) {
      onProgress({ name: asset.name, error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }
}
