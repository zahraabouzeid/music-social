import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useStats } from '@/api/hooks';
import type { Period } from '@/api/types';
import { Notice, Segmented, Text, colors, space } from '@/ui';

import { count, hours, periodOptions, periodPhrase } from '../format';
import { RankedList } from './RankedList';

export function StatsPanel({ username, isSelf }: { username: string; isSelf: boolean }) {
  const [period, setPeriod] = useState<Period>('month');
  const { data, isLoading, error } = useStats(username, period);

  return (
    <View style={styles.wrap}>
      <Segmented label="Time range" options={periodOptions} value={period} onChange={setPeriod} />
      {isLoading ? <ActivityIndicator color={colors.red} /> : null}
      {error ? <Notice tone="error" title="Stats could not load" body={error.message} /> : null}
      {data && data.totals.plays === 0 ? (
        <Notice
          title={`No plays in ${periodPhrase(period)}`}
          body={isSelf ? 'Import your history or connect a service from the You tab to fill this in.' : undefined}
        />
      ) : null}
      {data && data.totals.plays > 0 ? (
        <>
          <View style={styles.totals}>
            <Total value={hours(data.totals.minutes)} label="listened" />
            <Total value={count(data.totals.artists)} label="artists" />
            <Total value={count(data.totals.tracks)} label="songs" />
          </View>
          <RankedList
            title="Top artists"
            empty="No artists yet."
            rows={data.top_artists.map((artist) => ({ key: artist.name, title: artist.name, plays: artist.plays }))}
          />
          <RankedList
            title="Top songs"
            empty="No songs yet."
            rows={data.top_tracks.map((track) => ({
              key: String(track.track_id),
              title: track.title,
              subtitle: track.artist,
              plays: track.plays,
            }))}
          />
          <RankedList
            title="Top albums"
            empty="No albums yet."
            rows={data.top_albums.map((album) => ({
              key: `${album.artist}-${album.name}`,
              title: album.name,
              subtitle: album.artist,
              plays: album.plays,
            }))}
          />
        </>
      ) : null}
    </View>
  );
}

function Total({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.total}>
      <Text variant="number">{value}</Text>
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xl },
  totals: { flexDirection: 'row', gap: space.lg },
  total: { flex: 1 },
});
