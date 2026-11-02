import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useUpdateProfile } from '@/api/hooks';
import { useSession } from '@/auth/session';
import { Avatar, Button, Field, Group, GroupContent, GroupRow, Screen, Text, colors, space } from '@/ui';

export default function Settings() {
  const { user, signOut } = useSession();
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const changed = displayName !== user?.display_name || bio !== user?.bio;

  return (
    <Screen insetTop={false}>
      <View style={styles.identity}>
        <Avatar name={displayName || '?'} seed={user?.username ?? ''} size={64} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{displayName || 'Your name'}</Text>
          <Text color={colors.muted}>@{user?.username}</Text>
        </View>
      </View>

      <Group
        title="Profile"
        footer={update.error ? update.error.message : update.isSuccess && !changed ? 'Saved.' : undefined}
      >
        <GroupContent>
          <Field label="Name" value={displayName} onChangeText={setDisplayName} style={styles.input} />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={280}
            placeholder="What are you into?"
            style={styles.input}
          />
          <Button
            label="Save profile"
            compact
            disabled={!changed}
            busy={update.isPending}
            onPress={() => update.mutate({ display_name: displayName, bio })}
          />
        </GroupContent>
      </Group>

      <Group title="Your music">
        <GroupRow
          label="Music sources"
          detail="Import your history or connect Spotify and Last.fm"
          onPress={() => router.push('/connections')}
          showChevron
        />
      </Group>

      <Group title="Account">
        <GroupRow label="Email" value={user?.email} />
        <GroupRow label="Sign out" tone="accent" onPress={signOut} />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingBottom: space.sm },
  input: { backgroundColor: colors.raised, borderColor: 'transparent' },
});
