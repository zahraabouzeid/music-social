import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';

import { pressedStyle } from '@/ui';

type Props = {
  username: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function ProfileLink({ username, style, children }: Props) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/u/${username}`)} style={pressedStyle(style)}>
      {children}
    </Pressable>
  );
}
