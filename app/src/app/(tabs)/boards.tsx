import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useBoard } from '@/api/hooks';
import type { BoardEntry, Period, Scope } from '@/api/types';
import { useSession } from '@/auth/session';
import { count, hours, periodOptions, periodPhrase } from '@/features/format';
import { Avatar, Notice, Screen, SearchField, Segmented, Text, colors, radius, space } from '@/ui';

const scopes: { value: Scope; label: string }[] = [
  { value: 'following', label: 'Friends' },
  { value: 'global', label: 'Everyone' },
];

export default function Boards() {
  const { user } = useSession();
  const [scope, setScope] = useState<Scope>('following');
  const [period, setPeriod] = useState<Period>('week');
  const [artist, setArtist] = useState('');
  const board = useBoard(scope, period, artist);

  return (
    <Screen refreshing={board.isRefetching} onRefresh={board.refetch}>
      <Text variant="title">Leaderboard</Text>
      <View style={styles.filters}>
        <Segmented label="Who to compare" options={scopes} value={scope} onChange={setScope} />
        <Segmented label="Time range" options={periodOptions} value={period} onChange={setPeriod} />
        <SearchField
          value={artist}
          onChangeText={setArtist}
          placeholder="Filter by artist"
          accessibilityLabel="Filter the leaderboard by artist"
          autoCapitalize="words"
        />
      </View>

      <Text color={colors.muted}>
        Ranked by listening time in {periodPhrase(period)}
        {artist.trim() ? ` for ${artist.trim()}` : ''}.
      </Text>

      {board.isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {board.error ? <Notice tone="error" title="The leaderboard could not load" body={board.error.message} /> : null}
      {board.data?.entries.length === 0 ? (
        <Notice
          title="Nobody on the board yet"
          body={scope === 'following' ? 'Follow people or switch to Everyone.' : 'Nobody has plays in this range yet.'}
        />
      ) : null}
      <View style={styles.list}>
        {board.data?.entries.map((entry) => (
          <Row key={entry.username} entry={entry} isSelf={entry.username === user?.username} />
        ))}
      </View>
    </Screen>
  );
}

function Row({ entry, isSelf }: { entry: BoardEntry; isSelf: boolean }) {
  const leader = entry.rank === 1;
  return (
    <Link href={`/u/${entry.username}`} asChild>
      <Pressable
        accessibilityRole="link"
        style={StyleSheet.flatten([styles.row, leader && styles.leader, isSelf && !leader && styles.self])}
      >
        <Text variant="number" color={leader ? colors.highlight : colors.faint} style={styles.rank}>
          {entry.rank}
        </Text>
        <Avatar name={entry.display_name} seed={entry.username} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color={colors.text} numberOfLines={1}>
            {entry.display_name}
            {isSelf ? ' (you)' : ''}
          </Text>
          <Text variant="small" color={colors.muted}>
            {count(entry.plays)} plays
          </Text>
        </View>
        <Text variant="heading" color={colors.text}>
          {hours(entry.minutes)}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  filters: { gap: space.md },
  list: { gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
  },
  leader: { backgroundColor: colors.raised },
  self: { backgroundColor: colors.surface },
  rank: { width: 36, textAlign: 'center' },
});
