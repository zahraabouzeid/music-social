import { Stack, useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/features/profile/ProfileView';

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ProfileView username={username} underHeader />
    </>
  );
}
