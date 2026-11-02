import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, fonts } from './theme';

const swatches = [colors.accent, '#7A4FD6', '#1F7A6B', '#C2410C', '#3A5BD9'];

function swatchFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return swatches[hash % swatches.length];
}

type Props = {
  name: string;
  seed: string;
  size?: number;
};

export function Avatar({ name, seed, size = 40 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessibilityElementsHidden
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: swatchFor(seed) }]}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.45, lineHeight: size * 0.55 }} color={colors.text}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
