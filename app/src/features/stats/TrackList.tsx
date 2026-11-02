import { StyleSheet, View } from 'react-native';

import type { TopTrack } from '@/api/types';
import { Cover, Text, colors, space } from '@/ui';

import { count } from '../format';

export function TrackList({ title, tracks }: { title: string; tracks: TopTrack[] }) {
  return (
    <View style={styles.wrap}>
      <Text variant="heading">{title}</Text>
      {tracks.map((track, index) => (
        <View key={track.track_id} style={styles.row}>
          <Text variant="bodyStrong" color={colors.muted} style={styles.rank}>
            {index + 1}
          </Text>
          <Cover seed={`${track.artist}|${track.title}`} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {track.title}
            </Text>
            <Text variant="small" color={colors.muted} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
          <Text variant="small" color={colors.muted}>
            {count(track.plays)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rank: { width: 20, textAlign: 'center' },
  thumb: { width: 48, borderRadius: 4 },
});
