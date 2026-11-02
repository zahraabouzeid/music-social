import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BoardEntry } from '@/api/types';
import { Avatar, Text, colors, radius, space } from '@/ui';

import { hours } from '../format';

const STEP_HEIGHT: Record<number, number> = { 0: 112, 1: 80, 2: 56 };

export function Podium({ entries, selfUsername }: { entries: BoardEntry[]; selfUsername?: string }) {
  const [first, second, third] = entries;
  const places = [
    { entry: second, place: 1 },
    { entry: first, place: 0 },
    { entry: third, place: 2 },
  ];

  return (
    <View style={styles.podium} accessibilityLabel="Top three listeners">
      {places.map(({ entry, place }) =>
        entry ? (
          <Place key={entry.username} entry={entry} place={place} isSelf={entry.username === selfUsername} />
        ) : (
          <View key={`empty-${place}`} style={styles.column} />
        ),
      )}
    </View>
  );
}

function Place({ entry, place, isSelf }: { entry: BoardEntry; place: number; isSelf: boolean }) {
  const winner = place === 0;
  return (
    <Link href={`/u/${entry.username}`} asChild>
      <Pressable accessibilityRole="link" style={styles.column}>
        <View style={[styles.ring, winner && styles.winnerRing]}>
          <Avatar name={entry.display_name} seed={entry.username} size={winner ? 72 : 56} />
        </View>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.center}>
          {isSelf ? 'You' : entry.display_name}
        </Text>
        <Text variant="small" color={colors.muted} style={styles.center}>
          {hours(entry.minutes)}
        </Text>
        <View style={[styles.step, { height: STEP_HEIGHT[place] }, winner && styles.winnerStep]}>
          <Text variant="title" color={winner ? colors.onHighlight : colors.muted}>
            {entry.rank}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingTop: space.md },
  column: { flex: 1, alignItems: 'center', gap: space.xs },
  ring: { borderRadius: 999, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  winnerRing: { borderColor: colors.highlight },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  step: {
    alignSelf: 'stretch',
    marginTop: space.sm,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    backgroundColor: colors.raised,
    alignItems: 'center',
    paddingTop: space.sm,
  },
  winnerStep: { backgroundColor: colors.highlight },
});
