import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Text, colors, space } from '@/ui';

import { ProfileLink } from './ProfileLink';

type Props = {
  username: string;
  displayName: string;
  detail?: string;
  trailing?: ReactNode;
};

export function UserRow({ username, displayName, detail, trailing }: Props) {
  return (
    <View style={styles.row}>
      <ProfileLink username={username} style={styles.identity}>
        <Avatar name={displayName} seed={username} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {displayName}
          </Text>
          <Text variant="small" color={colors.muted} numberOfLines={2}>
            {detail ?? `@${username}`}
          </Text>
        </View>
      </ProfileLink>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
});
