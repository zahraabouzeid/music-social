import { useState } from 'react';

import { useFollow } from '@/api/hooks';
import { Button } from '@/ui';

export function FollowButton({ username }: { username: string }) {
  const follow = useFollow(username);
  const [following, setFollowing] = useState(false);
  return (
    <Button
      label={following ? 'Following' : 'Follow'}
      tone={following ? 'quiet' : 'primary'}
      compact
      busy={follow.isPending}
      onPress={() => follow.mutate(!following, { onSuccess: () => setFollowing(!following) })}
    />
  );
}
