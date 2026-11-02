import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useFollow, useMatch, useStats } from '@/api/hooks';
import type { Profile } from '@/api/types';
import { Avatar, Bars, Button, Text, colors, radius, space } from '@/ui';

import { count, dailySeries, listing, percent, plural } from '../format';

export function ProfileHeader({ profile }: { profile: Profile }) {
  const follow = useFollow(profile.username);
  const month = useStats(profile.username, 'month');
  const match = useMatch(profile.username, !profile.is_self);
  const series = dailySeries(month.data?.daily ?? [], 30);
  const busiest = Math.max(0, ...series);

  return (
    <View style={styles.wrap}>
      <View style={styles.identity}>
        <Avatar name={profile.display_name} seed={profile.username} size={72} />
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={2}>
            {profile.display_name}
          </Text>
          <Text color={colors.muted}>@{profile.username}</Text>
        </View>
        {profile.is_self ? (
          <Link href="/settings" asChild>
            <Button label="Edit" icon="settings" tone="quiet" compact onPress={() => undefined} />
          </Link>
        ) : null}
      </View>

      {profile.bio ? <Text>{profile.bio}</Text> : null}

      <View style={styles.counts}>
        <Count value={profile.counts.plays} label={plural(profile.counts.plays, 'play', 'plays')} />
        <Count value={profile.counts.followers} label={plural(profile.counts.followers, 'follower', 'followers')} />
        <Count value={profile.counts.following} label="following" />
      </View>

      {!profile.is_self ? (
        <Button
          label={profile.is_following ? 'Following' : 'Follow'}
          tone={profile.is_following ? 'quiet' : 'primary'}
          busy={follow.isPending}
          onPress={() => follow.mutate(!profile.is_following)}
        />
      ) : null}

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
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
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
