import { StyleSheet, View } from 'react-native';

import type { Message } from '@/api/types';
import { Cover, LogoMark, Text, colors, radius, space } from '@/ui';

import { clock, hours, periodPhrase } from '../format';

type Props = {
  message: Message;
  mine: boolean;
  showSender: boolean;
};

export function MessageBubble({ message, mine, showSender }: Props) {
  return (
    <View style={[styles.wrap, mine ? styles.mine : styles.theirs]}>
      {showSender && !mine ? (
        <Text variant="small" color={colors.muted} style={styles.sender}>
          {message.sender.display_name}
        </Text>
      ) : null}
      {message.kind === 'track' && message.track ? <TrackCard track={message.track} /> : null}
      {message.kind === 'stats' && message.payload ? <StatsCard payload={message.payload} /> : null}
      {message.body ? (
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text color={mine ? colors.onAccent : colors.text}>{message.body}</Text>
        </View>
      ) : null}
      <Text variant="small" color={colors.faint} style={mine ? styles.timeMine : styles.time}>
        {clock(message.created_at)}
      </Text>
    </View>
  );
}

function TrackCard({ track }: { track: NonNullable<Message['track']> }) {
  return (
    <View style={styles.card}>
      <Cover seed={`${track.artist}|${track.title}`} style={styles.cover} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {track.title}
        </Text>
        <Text variant="small" color={colors.muted} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
    </View>
  );
}

function StatsCard({ payload }: { payload: NonNullable<Message['payload']> }) {
  const [first, ...rest] = payload.top_artists;
  return (
    <View style={[styles.card, styles.statsCard]}>
      <View style={styles.statsTop}>
        <Text variant="small" color={colors.muted}>
          Top artists of {periodPhrase(payload.period)}
        </Text>
        <LogoMark size={16} />
      </View>
      {first ? (
        <Text variant="heading" numberOfLines={1}>
          {first.name}
        </Text>
      ) : null}
      {rest.slice(0, 3).map((artist, index) => (
        <Text key={artist.name} variant="small" numberOfLines={1}>
          {index + 2}. {artist.name}
        </Text>
      ))}
      <Text variant="small" color={colors.highlight}>
        {hours(payload.totals.minutes)} listened
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '80%', gap: space.xs, marginVertical: 2 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { paddingHorizontal: space.sm },
  bubble: { borderRadius: 20, paddingHorizontal: space.md + 2, paddingVertical: space.sm + 1 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.raised, borderBottomLeftRadius: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    width: 260,
  },
  cover: { width: 56, borderRadius: radius.sm },
  statsCard: { flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: space.md },
  statsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { paddingHorizontal: space.sm },
  timeMine: { paddingHorizontal: space.sm, textAlign: 'right' },
});
