import { StyleSheet, View } from 'react-native';

import { Text, colors, space } from '@/ui';

import { count } from '../format';

type Row = { key: string; title: string; subtitle?: string; plays: number };

export function RankedList({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.plays));
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {rows.length === 0 ? (
        <Text color={colors.muted}>{empty}</Text>
      ) : (
        rows.map((row, index) => (
          <View key={row.key} style={styles.row}>
            <Text variant="number" style={styles.rank} color={index === 0 ? colors.accent : colors.muted}>
              {index + 1}
            </Text>
            <View style={styles.body}>
              <View style={styles.titleLine}>
                <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
                  {row.title}
                </Text>
                <Text variant="small" color={colors.muted}>
                  {count(row.plays)} plays
                </Text>
              </View>
              {row.subtitle ? (
                <Text variant="small" color={colors.muted} numberOfLines={1}>
                  {row.subtitle}
                </Text>
              ) : null}
              <View style={styles.track}>
                <View style={[styles.meter, { width: `${(row.plays / max) * 100}%` }]} />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rank: { width: 36, textAlign: 'right' },
  body: { flex: 1, gap: 2 },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  title: { flex: 1 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: space.xs, overflow: 'hidden' },
  meter: { height: 4, borderRadius: 2, backgroundColor: colors.text },
});
