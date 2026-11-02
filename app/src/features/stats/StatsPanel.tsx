import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useStats } from '@/api/hooks';
import type { Period } from '@/api/types';
import { Block, Button, Notice, RowSkeleton, Segmented, Skeleton, Text, colors, space } from '@/ui';

import { count, hours, periodOptions, periodPhrase } from '../format';
import { Shelf } from './Shelf';
import { AlbumTile, ArtistTile } from './Tiles';
import { TrackList } from './TrackList';

export function StatsPanel({ username, isSelf }: { username: string; isSelf: boolean }) {
  const [period, setPeriod] = useState<Period>('month');
  const { data, isLoading, error } = useStats(username, period);

  return (
    <View style={styles.wrap}>
      <Segmented label="Time range" options={periodOptions} value={period} onChange={setPeriod} />
      {isLoading ? (
        <Skeleton label="Loading stats">
          <Block style={{ width: '60%', height: 32 }} />
          <RowSkeleton />
          <RowSkeleton />
        </Skeleton>
      ) : null}
      {error ? <Notice tone="error" title="Stats could not load" body={error.message} /> : null}
      {data && data.totals.plays === 0 ? (
        <Notice
          title={`No plays in ${periodPhrase(period)}`}
          body={isSelf ? 'Import your listening history or connect a service to fill this in.' : undefined}
          action={
            isSelf ? (
              <Link href="/connections" asChild>
                <Button label="Add your music" tone="secondary" compact onPress={() => undefined} />
              </Link>
            ) : undefined
          }
        />
      ) : null}
      {data && data.totals.plays > 0 ? (
        <>
          <View style={styles.totals}>
            <Total value={hours(data.totals.minutes)} label="listened" />
            <Total value={count(data.totals.artists)} label="artists" />
            <Total value={count(data.totals.tracks)} label="songs" />
          </View>
          <Shelf title="Top artists">
            {data.top_artists.map((artist) => (
              <ArtistTile key={artist.name} name={artist.name} plays={artist.plays} />
            ))}
          </Shelf>
          <TrackList title="Top songs" tracks={data.top_tracks} />
          {data.top_albums.length > 0 ? (
            <Shelf title="Top albums">
              {data.top_albums.map((album) => (
                <AlbumTile
                  key={`${album.artist}-${album.name}`}
                  name={album.name}
                  artist={album.artist}
                  plays={album.plays}
                />
              ))}
            </Shelf>
          ) : null}
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
