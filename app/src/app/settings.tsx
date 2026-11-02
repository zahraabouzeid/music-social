import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useUpdateProfile } from '@/api/hooks';
import { useSession } from '@/auth/session';
import { Button, Field, Notice, Screen, Text, colors, space } from '@/ui';

export default function Settings() {
  const { user, signOut } = useSession();
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  return (
    <Screen insetTop={false}>
      <View style={styles.section}>
        <Text variant="heading">Profile</Text>
        {update.error ? <Notice tone="error" title="Profile not saved" body={update.error.message} /> : null}
        {update.isSuccess ? <Text color={colors.muted}>Profile saved.</Text> : null}
        <Field label="Name" value={displayName} onChangeText={setDisplayName} />
        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={280}
          placeholder="What are you into?"
        />
        <Button
          label="Save profile"
          busy={update.isPending}
          onPress={() => update.mutate({ display_name: displayName, bio })}
        />
      </View>

      <View style={styles.section}>
        <Text variant="heading">Your music</Text>
        <Text color={colors.muted}>Import your listening history or connect Spotify and Last.fm.</Text>
        <Link href="/connections" asChild>
          <Button label="Manage music sources" tone="ink" onPress={() => undefined} />
        </Link>
      </View>

      <View style={styles.section}>
        <Text variant="heading">Account</Text>
        <Text color={colors.muted}>Signed in as {user?.email}</Text>
        <Button label="Sign out" tone="quiet" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md, paddingBottom: space.md },
});
