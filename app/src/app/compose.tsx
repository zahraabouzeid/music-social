import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useCreatePost, useRecentPlays } from '@/api/hooks';
import type { NewPost, Period } from '@/api/types';
import { periodOptions, periodPhrase } from '@/features/format';
import { Button, Field, Notice, Screen, Segmented, Text, colors, radius, space } from '@/ui';

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
          {plays.isLoading ? <ActivityIndicator color={colors.red} /> : null}
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
                style={[styles.song, selected && styles.songSelected]}
              >
                <Text variant="bodyStrong" color={selected ? colors.onInk : colors.ink} numberOfLines={1}>
                  {play.title}
                </Text>
                <Text variant="small" color={selected ? colors.onInkMuted : colors.muted} numberOfLines={1}>
                  {play.artist}
                </Text>
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  songSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
});
