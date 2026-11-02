import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDeletePost, useLike } from '@/api/hooks';
import type { Post } from '@/api/types';
import { Avatar, Card, Text, colors, radius, space } from '@/ui';

import { ago, count, hours, periodPhrase } from '../format';

export function PostCard({ post, canDelete = false }: { post: Post; canDelete?: boolean }) {
  const like = useLike();
  const remove = useDeletePost();
  const liked = post.liked_by_me;

  return (
    <Card>
      <View style={styles.header}>
        <Link href={`/u/${post.author.username}`} asChild>
          <Pressable accessibilityRole="link" style={styles.author}>
            <Avatar name={post.author.display_name} seed={post.author.username} size={36} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {post.author.display_name}
              </Text>
              <Text variant="small" color={colors.muted}>
                @{post.author.username}, {ago(post.created_at)}
              </Text>
            </View>
          </Pressable>
        </Link>
      </View>

      {post.caption ? <Text>{post.caption}</Text> : null}
      {post.kind === 'track' && post.track ? <TrackBlock track={post.track} /> : null}
      {post.kind === 'stats' && post.payload ? <StatsBlock payload={post.payload} /> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove like' : 'Like'}
          accessibilityState={{ selected: liked }}
          onPress={() => like.mutate({ id: post.id, like: !liked })}
          style={[styles.likeButton, liked && styles.liked]}
        >
          <Text variant="small" color={liked ? colors.onInk : colors.ink}>
            {liked ? 'Liked' : 'Like'}
            {post.likes > 0 ? `  ${count(post.likes)}` : ''}
          </Text>
        </Pressable>
        {canDelete ? (
          <Pressable accessibilityRole="button" onPress={() => remove.mutate(post.id)} style={styles.quietButton}>
            <Text variant="small" color={colors.muted}>
              Delete
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function TrackBlock({ track }: { track: NonNullable<Post['track']> }) {
  return (
    <View style={styles.track}>
      <View style={styles.disc} />
      <View style={{ flex: 1 }}>
        <Text variant="heading" color={colors.onInk} numberOfLines={2}>
          {track.title}
        </Text>
        <Text color={colors.onInkMuted} numberOfLines={1}>
          {track.artist}
          {track.album ? `, ${track.album}` : ''}
        </Text>
      </View>
    </View>
  );
}

function StatsBlock({ payload }: { payload: NonNullable<Post['payload']> }) {
  return (
    <View style={styles.stats}>
      <Text variant="small" color={colors.muted}>
        Top artists of {periodPhrase(payload.period)}, {hours(payload.totals.minutes)} listened
      </Text>
      {payload.top_artists.map((artist, index) => (
        <View key={artist.name} style={styles.statRow}>
          <Text variant="heading" color={index === 0 ? colors.red : colors.muted} style={{ width: 22 }}>
            {index + 1}
          </Text>
          <Text variant={index === 0 ? 'title' : 'bodyStrong'} style={{ flex: 1 }} numberOfLines={1}>
            {artist.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.lg,
  },
  disc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.inkSoft,
    borderWidth: 18,
    borderColor: colors.red,
  },
  stats: { gap: space.sm, paddingVertical: space.xs },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  likeButton: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs + 2,
  },
  liked: { backgroundColor: colors.red, borderColor: colors.red },
  quietButton: { paddingHorizontal: space.md, paddingVertical: space.xs + 2 },
});
