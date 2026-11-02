import { Fragment } from 'react';
import { View } from 'react-native';

import type { Post } from '@/api/types';
import { Divider } from '@/ui';

import { PostCard } from './PostCard';

export function PostList({ posts, canDelete }: { posts: Post[]; canDelete: (post: Post) => boolean }) {
  return (
    <View>
      {posts.map((post, index) => (
        <Fragment key={post.id}>
          {index > 0 ? <Divider /> : null}
          <PostCard post={post} canDelete={canDelete(post)} />
        </Fragment>
      ))}
    </View>
  );
}
