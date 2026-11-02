import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { request } from '@/api/client';
import { useConnections, useImports, useInvalidateListening } from '@/api/hooks';
import type { Service } from '@/api/types';
import { useSession } from '@/auth/session';
import { ago, count } from '@/features/format';
import { FileResult, pickAndImport } from '@/features/upload';
import { useSubmit } from '@/features/useSubmit';
import { Button, Group, GroupContent, GroupRow, Icon, Notice, Screen, SearchField, Text, colors, space } from '@/ui';

const serviceNames: Record<Service, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  lastfm: 'Last.fm',
  deezer: 'Deezer',
};

export default function Connections() {
  const { token } = useSession();
  const params = useLocalSearchParams<{ connected?: string; error?: string }>();
  const connections = useConnections();
  const imports = useImports();
  const invalidate = useInvalidateListening();
  const [results, setResults] = useState<FileResult[]>([]);
  const upload = useSubmit();

  const startImport = () =>
    upload.run(async () => {
      setResults([]);
      await pickAndImport(token, (result) => setResults((current) => [...current, result]));
      invalidate();
    });

  const connected = new Map((connections.data?.connected ?? []).map((item) => [item.service, item]));
  const available = connections.data?.available ?? [];

  return (
    <Screen insetTop={false} refreshing={connections.isRefetching} onRefresh={connections.refetch}>
      {params.connected ? (
        <Notice
          title={`${serviceNames[params.connected as Service] ?? 'Service'} is connected`}
          body="New plays arrive every few minutes."
        />
      ) : null}
      {params.error ? (
        <Notice
          tone="error"
          title="The connection did not go through"
          body="Try again, and allow access when the service asks."
        />
      ) : null}

      <Group
        title="Import your history"
        footer="Request your data from Spotify (Extended streaming history) or Apple (privacy.apple.com), then pick the JSON or CSV files. Plays you already have are skipped."
      >
        <GroupRow
          label={upload.busy ? 'Importing…' : 'Choose files'}
          onPress={upload.busy ? undefined : startImport}
          trailing={<Icon name="upload" size={20} color={colors.muted} />}
        />
        {results.map((result, index) => (
          <GroupRow
            key={`${result.name}-${index}`}
            label={result.name}
            detail={
              result.record
                ? `${count(result.record.plays_added)} new of ${count(result.record.plays_found)} plays from ${serviceNames[result.record.service]}`
                : result.error
            }
          />
        ))}
        {upload.error ? <GroupRow label="Import failed" detail={upload.error} /> : null}
      </Group>

      <Group
        title="Live connections"
        footer={
          available.length === 0 && !connections.isLoading
            ? 'No live connections are set up on this server. File imports work without them.'
            : 'New plays arrive every few minutes.'
        }
      >
        {available.includes('lastfm') ? <LastfmRow connection={connected.get('lastfm')} /> : null}
        {available.includes('spotify') ? <SpotifyRow connection={connected.get('spotify')} /> : null}
      </Group>

      {imports.data && imports.data.length > 0 ? (
        <Group title="Past imports">
          {imports.data.map((record) => (
            <GroupRow
              key={record.id}
              label={serviceNames[record.service]}
              detail={ago(record.created_at)}
              value={`${count(record.plays_added)} new`}
            />
          ))}
        </Group>
      ) : null}
    </Screen>
  );
}

type Connection = { external_id: string; last_synced_at: string | null; last_error: string | null };

function status(connection: Connection) {
  if (connection.last_error) return `Last sync failed: ${connection.last_error}`;
  const synced = connection.last_synced_at ? `synced ${ago(connection.last_synced_at)}` : 'first sync pending';
  return `${connection.external_id}, ${synced}`;
}

function ConnectedRow({ name, service, connection }: { name: string; service: Service; connection: Connection }) {
  const { token } = useSession();
  const invalidate = useInvalidateListening();
  const { busy, error, run } = useSubmit();
  const call = (path: string, method: 'POST' | 'DELETE') =>
    run(async () => {
      await request(path, { method, token });
      invalidate();
    });
  return (
    <GroupRow
      label={name}
      detail={error ?? status(connection)}
      trailing={
        <View style={styles.actions}>
          <Button label="Sync" compact busy={busy} onPress={() => call(`/connections/${service}/sync`, 'POST')} />
          <Button label="Remove" tone="quiet" compact onPress={() => call(`/connections/${service}`, 'DELETE')} />
        </View>
      }
    />
  );
}

function LastfmRow({ connection }: { connection?: Connection }) {
  const { token } = useSession();
  const invalidate = useInvalidateListening();
  const [username, setUsername] = useState('');
  const { busy, error, run } = useSubmit();

  if (connection) return <ConnectedRow name="Last.fm" service="lastfm" connection={connection} />;
  return (
    <GroupContent>
      <View style={{ gap: 2 }}>
        <Text variant="bodyStrong">Last.fm</Text>
        <Text variant="small" color={colors.muted}>
          Brings in everything you scrobble, from any player.
        </Text>
      </View>
      <View style={styles.inline}>
        <View style={{ flex: 1 }}>
          <SearchField
            value={username}
            onChangeText={setUsername}
            placeholder="Last.fm username"
            accessibilityLabel="Last.fm username"
          />
        </View>
        <Button
          label="Connect"
          compact
          busy={busy}
          disabled={!username.trim()}
          onPress={() =>
            run(async () => {
              await request('/connections/lastfm', { method: 'POST', json: { username }, token });
              await request('/connections/lastfm/sync', { method: 'POST', token }).catch(() => undefined);
              invalidate();
            })
          }
        />
      </View>
      {error ? <Text color={colors.accent}>{error}</Text> : null}
    </GroupContent>
  );
}

function SpotifyRow({ connection }: { connection?: Connection }) {
  const { token } = useSession();
  const { busy, error, run } = useSubmit();

  if (connection) return <ConnectedRow name="Spotify" service="spotify" connection={connection} />;
  const connect = () =>
    run(async () => {
      const { url } = await request<{ url: string }>('/connections/spotify/authorize', { token });
      if (Platform.OS === 'web') globalThis.location.assign(url);
      else await WebBrowser.openBrowserAsync(url);
    });
  return (
    <GroupRow
      label="Spotify"
      detail={error ?? 'Picks up what you play on Spotify.'}
      trailing={<Button label="Connect" compact busy={busy} onPress={connect} />}
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
