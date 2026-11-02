import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useFeed } from '@/api/hooks';
import type { Post } from '@/api/types';
import { useSession } from '@/auth/session';
import { PostList } from '@/features/posts/PostList';
import { Button, IconButton, Notice, Screen, Segmented, Wordmark, colors, space } from '@/ui';

type Filter = 'all' | Post['kind'];

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'track', label: 'Songs' },
  { value: 'stats', label: 'Stats' },
  { value: 'text', label: 'Notes' },
];

export default function Feed() {
  const { user } = useSession();
  const feed = useFeed();
  const [filter, setFilter] = useState<Filter>('all');
  const posts = (feed.data ?? []).filter((post) => filter === 'all' || post.kind === filter);

  return (
    <Screen refreshing={feed.isRefetching} onRefresh={feed.refetch}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Wordmark size={20} />
        </View>
        <IconButton icon="plus" label="Share something" tone="accent" onPress={() => router.push('/compose')} />
      </View>
      <Segmented label="Show" options={filters} value={filter} onChange={setFilter} />

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
      {feed.data && feed.data.length > 0 && posts.length === 0 ? (
        <Notice title="Nothing of this kind yet" body="Try another filter or share one yourself." />
      ) : null}
      <PostList posts={posts} canDelete={(post) => post.author.username === user?.username} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
