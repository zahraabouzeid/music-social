import { Link } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useFeed } from '@/api/hooks';
import { useSession } from '@/auth/session';
import { PostList } from '@/features/posts/PostList';
import { Button, Notice, Screen, Wordmark, colors, space } from '@/ui';

export default function Feed() {
  const { user } = useSession();
  const feed = useFeed();

  return (
    <Screen refreshing={feed.isRefetching} onRefresh={feed.refetch}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Wordmark size={20} />
        </View>
        <Link href="/compose" asChild>
          <Button label="Share" icon="plus" compact onPress={() => undefined} />
        </Link>
      </View>
      {feed.isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {feed.error ? <Notice tone="error" title="The feed could not load" body={feed.error.message} /> : null}
      {feed.data?.length === 0 ? (
        <Notice
          title="Your feed is quiet"
          body="Follow people with similar taste and their songs and stats show up here."
          action={
            <Link href="/discover" asChild>
              <Button label="Find people" tone="secondary" compact onPress={() => undefined} />
            </Link>
          }
        />
      ) : null}
      {feed.data ? <PostList posts={feed.data} canDelete={(post) => post.author.username === user?.username} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
