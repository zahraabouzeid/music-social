import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCreatePost, useRecentPlays } from '@/api/hooks';
import type { NewPost, Period } from '@/api/types';
import { periodOptions, periodPhrase } from '@/features/format';
import {
  Button,
  Cover,
  Field,
  Notice,
  RowSkeleton,
  Screen,
  Segmented,
  Skeleton,
  Text,
  colors,
  pressedStyle,
  radius,
  space,
} from '@/ui';

type Kind = NewPost['kind'];

const SONG_CHOICES = 8;

const kinds: { value: Kind; label: string }[] = [
  { value: 'track', label: 'Song' },
  { value: 'stats', label: 'Stats' },
  { value: 'text', label: 'Note' },
];

export default function Compose() {
  const [kind, setKind] = useState<Kind>('track');
  const [caption, setCaption] = useState('');
  const [trackId, setTrackId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const plays = useRecentPlays(30);
  const create = useCreatePost();

  const uniquePlays = (plays.data ?? [])
    .filter((play, index, all) => all.findIndex((other) => other.track_id === play.track_id) === index)
    .slice(0, SONG_CHOICES);

  const post = (): NewPost | null => {
    if (kind === 'track') return trackId ? { kind, track_id: trackId, caption } : null;
    if (kind === 'stats') return { kind, period, caption };
    return caption.trim() ? { kind, caption } : null;
  };
  const ready = post();

  const submit = () => {
    if (!ready) return;
    create.mutate(ready, { onSuccess: () => router.back() });
  };

  return (
    <Screen insetTop={false}>
      <Segmented label="What to share" options={kinds} value={kind} onChange={setKind} />

      {kind === 'track' ? (
        <View style={styles.list}>
          <Text variant="heading">Pick one of your recent songs</Text>
          {plays.isLoading ? (
            <Skeleton label="Loading your songs">
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </Skeleton>
          ) : null}
          {uniquePlays.length === 0 && !plays.isLoading ? (
            <Notice title="No plays yet" body="Import your history or connect a service, then share what you hear." />
          ) : null}
          {uniquePlays.map((play) => {
            const selected = play.track_id === trackId;
            return (
              <Pressable
                key={play.track_id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setTrackId(play.track_id)}
                style={pressedStyle(styles.song, selected && styles.songSelected)}
              >
                <Cover seed={`${play.artist}|${play.title}`} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {play.title}
                  </Text>
                  <Text variant="small" color={colors.muted} numberOfLines={1}>
                    {play.artist}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {kind === 'stats' ? (
        <View style={styles.list}>
          <Text variant="heading">Share your top artists</Text>
          <Segmented label="Time range" options={periodOptions} value={period} onChange={setPeriod} />
          <Text color={colors.muted}>
            Your top five artists and listening time of {periodPhrase(period)} go into the post.
          </Text>
        </View>
      ) : null}

      <Field
        label={kind === 'text' ? 'Note' : 'Caption (optional)'}
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={500}
        placeholder={kind === 'text' ? 'Concert plans, a hot take, a question' : 'Why this one?'}
      />

      {create.error ? <Notice tone="error" title="Not shared" body={create.error.message} /> : null}
      <Button label="Post" disabled={!ready} busy={create.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  song: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.sm,
  },
  songSelected: { backgroundColor: colors.raised },
  thumb: { width: 48, borderRadius: radius.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
});
