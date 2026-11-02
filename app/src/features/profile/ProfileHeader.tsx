import { Link, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useOpenDirect, useUserNowPlaying } from '@/api/chat';
import { useFollow, useMatch, useStats } from '@/api/hooks';
import type { Profile } from '@/api/types';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Avatar, Bars, Button, Text, colors, radius, space, swatchFor } from '@/ui';

import { Equalizer } from '../chat/NowPlayingStrip';
import { count, dailySeries, listing, percent, plural } from '../format';

export function ProfileHeader({ profile, underHeader = false }: { profile: Profile; underHeader?: boolean }) {
  const follow = useFollow(profile.username);
  const openDirect = useOpenDirect();
  const nowPlaying = useUserNowPlaying(profile.username);
  const month = useStats(profile.username, 'month');
  const match = useMatch(profile.username, !profile.is_self);
  const series = dailySeries(month.data?.daily ?? [], 30);
  const busiest = Math.max(0, ...series);

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, underHeader && styles.heroUnderHeader]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="profile-glow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={swatchFor(profile.username)} stopOpacity={0.75} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#profile-glow)" />
        </Svg>
        <Avatar name={profile.display_name} seed={profile.username} size={104} />
        <View style={styles.names}>
          <Text variant="hero" numberOfLines={2}>
            {profile.display_name}
          </Text>
          <Text color={colors.muted}>@{profile.username}</Text>
        </View>
        {nowPlaying.data ? (
          <View style={styles.listening}>
            <Equalizer />
            <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
              Listening to {nowPlaying.data.title} by {nowPlaying.data.artist}
            </Text>
          </View>
        ) : null}
      </View>

      {profile.bio ? <Text>{profile.bio}</Text> : null}

      <View style={styles.counts}>
        <Count value={profile.counts.plays} label={plural(profile.counts.plays, 'play', 'plays')} />
        <Count value={profile.counts.followers} label={plural(profile.counts.followers, 'follower', 'followers')} />
        <Count value={profile.counts.following} label="following" />
      </View>

      <View style={styles.actions}>
        {profile.is_self ? (
          <Link href="/settings" asChild>
            <Button label="Edit profile" icon="settings" tone="quiet" compact onPress={() => undefined} />
          </Link>
        ) : (
          <>
            <Button
              label={profile.is_following ? 'Following' : 'Follow'}
              tone={profile.is_following ? 'quiet' : 'primary'}
              compact
              busy={follow.isPending}
              onPress={() => follow.mutate(!profile.is_following)}
            />
            <Button
              label="Message"
              icon="chat"
              tone="quiet"
              compact
              busy={openDirect.isPending}
              onPress={() =>
                openDirect.mutate(profile.username, {
                  onSuccess: (conversation) => router.push(`/chats/${conversation.id}`),
                })
              }
            />
          </>
        )}
      </View>

      {!profile.is_self && match.data && match.data.similarity > 0 ? (
        <View style={styles.match}>
          <Text variant="number" color={colors.highlight}>
            {percent(match.data.similarity)}
          </Text>
          <Text color={colors.text} style={{ flex: 1 }}>
            taste match. You both play {listing(match.data.shared_artists.slice(0, 3))}.
          </Text>
        </View>
      ) : null}

      <View style={styles.wave}>
        <Bars
          values={series}
          height={88}
          label={`Plays per day over the last 30 days, up to ${busiest} on the busiest day`}
          baseColor={colors.accent}
        />
        <Text variant="small" color={colors.muted}>
          Last 30 days{busiest > 0 ? `, busiest day ${busiest} plays` : ''}
        </Text>
      </View>
    </View>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <Text color={colors.muted}>
      <Text variant="bodyStrong">{count(value)}</Text> {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  hero: {
    marginHorizontal: -space.lg,
    marginTop: -space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.sm,
    gap: space.lg,
  },
  heroUnderHeader: { paddingTop: 72 },
  names: { gap: space.xs },
  listening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: radius.pill,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    maxWidth: '100%',
  },
  actions: { flexDirection: 'row', gap: space.sm },
  counts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl, rowGap: space.xs },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    padding: space.lg,
  },
  wave: { gap: space.sm, paddingTop: space.sm },
});
