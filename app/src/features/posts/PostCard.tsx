import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useDeletePost, useLike } from '@/api/hooks';
import type { Post } from '@/api/types';
import { Avatar, Cover, Icon, LogoMark, Text, colors, pressedStyle, radius, space } from '@/ui';

import { ago, count, hours, periodPhrase } from '../format';

export function PostCard({ post, canDelete = false }: { post: Post; canDelete?: boolean }) {
  const like = useLike();
  const remove = useDeletePost();
  const liked = post.liked_by_me;
  const pop = useRef(new Animated.Value(1)).current;

  const toggleLike = () => {
    if (!liked) {
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, friction: 3, tension: 180, useNativeDriver: Platform.OS !== 'web' }).start();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    like.mutate({ id: post.id, like: !liked });
  };

  return (
    <View style={styles.post}>
      <Link href={`/u/${post.author.username}`} asChild>
        <Pressable accessibilityRole="link" style={pressedStyle(styles.author)}>
          <Avatar name={post.author.display_name} seed={post.author.username} size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {post.author.display_name}
            </Text>
            <Text variant="small" color={colors.muted}>
              {ago(post.created_at)}
            </Text>
          </View>
        </Pressable>
      </Link>

      {post.caption ? <Text variant={post.kind === 'text' ? 'lead' : 'body'}>{post.caption}</Text> : null}
      {post.kind === 'track' && post.track ? <TrackBlock track={post.track} /> : null}
      {post.kind === 'stats' && post.payload ? <StatsBlock payload={post.payload} /> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove like' : 'Like'}
          accessibilityState={{ selected: liked }}
          onPress={toggleLike}
          hitSlop={8}
          style={styles.like}
        >
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Icon name="heart" size={22} filled={liked} color={liked ? colors.accent : colors.muted} />
          </Animated.View>
          {post.likes > 0 ? (
            <Text variant="small" color={liked ? colors.text : colors.muted}>
              {count(post.likes)}
            </Text>
          ) : null}
        </Pressable>
        {canDelete ? (
          <Pressable accessibilityRole="button" onPress={() => remove.mutate(post.id)} hitSlop={8}>
            <Text variant="small" color={colors.faint}>
              Delete
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TrackBlock({ track }: { track: NonNullable<Post['track']> }) {
  return (
    <View style={styles.track}>
      <Cover seed={`${track.artist}|${track.title}`} aspectRatio={1.6} />
      <View>
        <Text variant="title" numberOfLines={2}>
          {track.title}
        </Text>
        <Text color={colors.muted} numberOfLines={1}>
          {track.artist}
          {track.album ? `, ${track.album}` : ''}
        </Text>
      </View>
    </View>
  );
}

function StatsBlock({ payload }: { payload: NonNullable<Post['payload']> }) {
  const [first, ...rest] = payload.top_artists;
  return (
    <View style={styles.poster}>
      <View style={styles.posterTop}>
        <Text variant="small" color={colors.muted}>
          Top artists of {periodPhrase(payload.period)}
        </Text>
        <LogoMark size={22} />
      </View>
      {first ? (
        <Text variant="hero" numberOfLines={2}>
          {first.name}
        </Text>
      ) : null}
      <View style={styles.posterList}>
        {rest.map((artist, index) => (
          <View key={artist.name} style={styles.posterRow}>
            <Text variant="bodyStrong" color={colors.faint} style={styles.posterRank}>
              {index + 2}
            </Text>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {artist.name}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.posterFooter}>
        <Text variant="number" color={colors.highlight}>
          {hours(payload.totals.minutes)}
        </Text>
        <Text variant="small" color={colors.muted}>
          listened, {count(payload.totals.plays)} plays
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: { gap: space.md, paddingVertical: space.lg },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { gap: space.md },
  poster: {
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    padding: space.xl,
    gap: space.md,
  },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  posterList: { gap: space.xs },
  posterRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  posterRank: { width: 16 },
  posterFooter: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingTop: space.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  like: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
