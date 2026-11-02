import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './theme';

type Tone = 'primary' | 'secondary' | 'quiet';

type Props = {
  label: string;
  onPress: () => void;
  tone?: Tone;
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

const tones: Record<Tone, { background: string; text: string; border: string }> = {
  primary: { background: colors.accent, text: colors.onAccent, border: colors.accent },
  secondary: { background: colors.text, text: colors.bg, border: colors.text },
  quiet: { background: 'transparent', text: colors.text, border: colors.line },
};

export function Button({ label, onPress, tone = 'primary', busy = false, disabled = false, compact = false }: Props) {
  const palette = tones[tone];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text variant="bodyStrong" color={palette.text}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 36, paddingHorizontal: space.lg },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  inactive: { opacity: 0.5 },
});
