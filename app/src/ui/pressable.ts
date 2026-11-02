import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

export function pressedStyle(...base: StyleProp<ViewStyle>[]) {
  return ({ pressed }: { pressed: boolean }) => StyleSheet.flatten([...base, pressed && { opacity: 0.6 }]);
}
