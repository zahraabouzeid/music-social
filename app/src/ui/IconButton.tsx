import { Pressable, StyleSheet } from 'react-native';

import { Icon, IconName } from './Icon';
import { colors } from './theme';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'plain';
};

export function IconButton({ icon, label, onPress, tone = 'plain' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.base, tone === 'accent' && styles.accent, pressed && styles.pressed]}
    >
      <Icon name={icon} size={22} color={tone === 'accent' ? colors.onAccent : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  accent: { backgroundColor: colors.accent },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
