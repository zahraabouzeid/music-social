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
import { Button, Card, Field, Notice, Screen, Text, colors, space } from '@/ui';

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
      {params.connected ? <Notice title={`${serviceNames[params.connected as Service] ?? 'Service'} is connected`} body="New plays arrive every few minutes." /> : null}
      {params.error ? <Notice tone="error" title="The connection did not go through" body="Try again, and allow access when the service asks." /> : null}

      <Card>
        <Text variant="heading">Import your history</Text>
        <Text color={colors.muted}>
          Request your data from Spotify (Extended streaming history) or Apple (privacy.apple.com), then pick the JSON or
          CSV files here. Plays you already have are skipped.
        </Text>
        <Button label="Choose files" tone="ink" busy={upload.busy} onPress={startImport} />
        {upload.error ? <Text color={colors.red}>{upload.error}</Text> : null}
        {results.map((result, index) => (
          <Text key={`${result.name}-${index}`} variant="small" color={result.error ? colors.red : colors.ink}>
            {result.name}:{' '}
            {result.record
              ? `${count(result.record.plays_added)} new of ${count(result.record.plays_found)} plays from ${serviceNames[result.record.service]}`
              : result.error}
          </Text>
        ))}
      </Card>

      <Text variant="heading">Live connections</Text>
      {available.length === 0 && !connections.isLoading ? (
        <Notice title="No live connections on this server" body="File imports work without them." />
      ) : null}
      {available.includes('lastfm') ? <LastfmCard connection={connected.get('lastfm')} /> : null}
      {available.includes('spotify') ? <SpotifyCard connection={connected.get('spotify')} /> : null}

      {imports.data && imports.data.length > 0 ? (
        <View style={styles.history}>
          <Text variant="heading">Past imports</Text>
          {imports.data.map((record) => (
            <Text key={record.id} variant="small" color={colors.muted}>
              {serviceNames[record.service]}, {ago(record.created_at)}: {count(record.plays_added)} new plays
            </Text>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

type Connection = { external_id: string; last_synced_at: string | null; last_error: string | null };

function ConnectionStatus({ connection }: { connection: Connection }) {
  return (
    <>
      <Text color={colors.muted}>
        Connected as {connection.external_id}
        {connection.last_synced_at ? `, synced ${ago(connection.last_synced_at)}` : ', first sync pending'}.
      </Text>
      {connection.last_error ? <Text color={colors.red}>Last sync failed: {connection.last_error}</Text> : null}
    </>
  );
}

function ConnectedActions({ service }: { service: Service }) {
  const { token } = useSession();
  const invalidate = useInvalidateListening();
  const { busy, error, run } = useSubmit();
  return (
    <>
      <View style={styles.actions}>
        <Button
          label="Sync now"
          compact
          busy={busy}
          onPress={() => run(async () => {
            await request(`/connections/${service}/sync`, { method: 'POST', token });
            invalidate();
          })}
        />
        <Button
          label="Disconnect"
          tone="quiet"
          compact
          onPress={() => run(async () => {
            await request(`/connections/${service}`, { method: 'DELETE', token });
            invalidate();
          })}
        />
      </View>
      {error ? <Text color={colors.red}>{error}</Text> : null}
    </>
  );
}

function LastfmCard({ connection }: { connection?: Connection }) {
  const { token } = useSession();
  const invalidate = useInvalidateListening();
  const [username, setUsername] = useState('');
  const { busy, error, run } = useSubmit();

  return (
    <Card>
      <Text variant="heading">Last.fm</Text>
      {connection ? (
        <>
          <ConnectionStatus connection={connection} />
          <ConnectedActions service="lastfm" />
        </>
      ) : (
        <>
          <Text color={colors.muted}>Brings in everything you scrobble, from any player.</Text>
          <Field label="Last.fm username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Button
            label="Connect Last.fm"
            tone="ink"
            busy={busy}
            disabled={!username.trim()}
            onPress={() => run(async () => {
              await request('/connections/lastfm', { method: 'POST', json: { username }, token });
              await request('/connections/lastfm/sync', { method: 'POST', token }).catch(() => undefined);
              invalidate();
            })}
          />
          {error ? <Text color={colors.red}>{error}</Text> : null}
        </>
      )}
    </Card>
  );
}

function SpotifyCard({ connection }: { connection?: Connection }) {
  const { token } = useSession();
  const { busy, error, run } = useSubmit();

  const connect = () =>
    run(async () => {
      const { url } = await request<{ url: string }>('/connections/spotify/authorize', { token });
      if (Platform.OS === 'web') globalThis.location.assign(url);
      else await WebBrowser.openBrowserAsync(url);
    });

  return (
    <Card>
      <Text variant="heading">Spotify</Text>
      {connection ? (
        <>
          <ConnectionStatus connection={connection} />
          <ConnectedActions service="spotify" />
        </>
      ) : (
        <>
          <Text color={colors.muted}>Picks up what you play on Spotify every few minutes.</Text>
          <Button label="Connect Spotify" tone="ink" busy={busy} onPress={connect} />
          {error ? <Text color={colors.red}>{error}</Text> : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm },
  history: { gap: space.xs },
});
