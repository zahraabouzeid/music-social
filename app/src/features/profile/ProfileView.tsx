import { StyleSheet, View } from 'react-native';

import { useProfile, useUserPosts } from '@/api/hooks';
import { Block, Notice, Screen, Skeleton, Text, colors, space } from '@/ui';

import { PostList } from '../posts/PostList';
import { StatsPanel } from '../stats/StatsPanel';
import { ProfileHeader } from './ProfileHeader';

export function ProfileView({ username, underHeader = false }: { username: string; underHeader?: boolean }) {
  const profile = useProfile(username);
  const posts = useUserPosts(username);

  const refresh = () => {
    profile.refetch();
    posts.refetch();
  };

  return (
    <Screen refreshing={profile.isRefetching} onRefresh={refresh}>
      {profile.isLoading ? (
        <Skeleton label="Loading the profile">
          <Block style={{ width: 104, height: 104, borderRadius: 52, marginTop: 72 }} />
          <Block style={{ width: '60%', height: 40 }} />
          <Block style={{ width: '40%', height: 16 }} />
        </Skeleton>
      ) : null}
      {profile.error ? <Notice tone="error" title="This profile could not load" body={profile.error.message} /> : null}
      {profile.data ? (
        <>
          <ProfileHeader profile={profile.data} underHeader={underHeader} />
          <StatsPanel username={username} isSelf={profile.data.is_self} />
          <View style={styles.posts}>
            <Text variant="heading">Posts</Text>
            {posts.data?.length === 0 ? (
              <Text color={colors.muted}>
                {profile.data.is_self ? 'Share a song or your stats from the Feed tab.' : 'Nothing shared yet.'}
              </Text>
            ) : null}
            {posts.data ? <PostList posts={posts.data} canDelete={() => profile.data.is_self} /> : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  posts: { gap: space.md },
});
