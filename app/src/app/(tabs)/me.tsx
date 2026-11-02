import { useSession } from '@/auth/session';
import { Button, Screen, Text } from '@/ui';

export default function Me() {
  const { user, signOut } = useSession();
  return (
    <Screen>
      <Text variant="title">{user?.display_name}</Text>
      <Button label="Sign out" tone="quiet" onPress={signOut} />
    </Screen>
  );
}
