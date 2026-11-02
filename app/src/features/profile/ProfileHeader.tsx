import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useFollow, useMatch, useStats } from '@/api/hooks';
import type { Profile } from '@/api/types';
import { Avatar, Bars, Button, Text, colors, radius, space } from '@/ui';

import { count, dailySeries, percent, plural } from '../format';

export function ProfileHeader({ profile }: { profile: Profile }) {
  const follow = useFollow(profile.username);
  const month = useStats(profile.username, 'month');
  const match = useMatch(profile.username, !profile.is_self);
  const series = dailySeries(month.data?.daily ?? [], 30);
  const busiest = Math.max(0, ...series);

  return (
    <View style={styles.block}>
      <View style={styles.identity}>
        <Avatar name={profile.display_name} seed={profile.username} size={64} />
        <View style={{ flex: 1 }}>
          <Text variant="title" color={colors.onInk} numberOfLines={2}>
            {profile.display_name}
          </Text>
          <Text color={colors.onInkMuted}>@{profile.username}</Text>
        </View>
      </View>

      {profile.bio ? <Text color={colors.onInk}>{profile.bio}</Text> : null}

      <View style={styles.wave}>
        <Bars
          values={series}
          height={64}
          label={`Plays per day over the last 30 days, up to ${busiest} on the busiest day`}
          baseColor={colors.red}
        />
        <Text variant="small" color={colors.onInkMuted}>
          Last 30 days{busiest > 0 ? `, busiest day ${busiest} plays` : ''}
        </Text>
      </View>

      <View style={styles.counts}>
        <Count value={profile.counts.plays} label={plural(profile.counts.plays, 'play', 'plays')} />
        <Count value={profile.counts.followers} label={plural(profile.counts.followers, 'follower', 'followers')} />
        <Count value={profile.counts.following} label="following" />
      </View>

      {!profile.is_self && match.data && match.data.similarity > 0 ? (
        <Text color={colors.onInk}>
          <Text variant="bodyStrong" color={colors.yellow}>
            {percent(match.data.similarity)} taste match.
          </Text>{' '}
          You both play {match.data.shared_artists.slice(0, 3).join(', ')}.
        </Text>
      ) : null}

      {profile.is_self ? (
        <Link href="/settings" asChild>
          <Button label="Edit profile" tone="onInk" compact onPress={() => undefined} />
        </Link>
      ) : (
        <Button
          label={profile.is_following ? 'Following' : 'Follow'}
          tone={profile.is_following ? 'onInk' : 'primary'}
          compact
          busy={follow.isPending}
          onPress={() => follow.mutate(!profile.is_following)}
        />
      )}
    </View>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="number" color={colors.onInk}>
        {count(value)}
      </Text>
      <Text variant="small" color={colors.onInkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.ink, borderRadius: radius.md + 8, padding: space.xl, gap: space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  wave: { gap: space.sm },
  counts: { flexDirection: 'row' },
});
