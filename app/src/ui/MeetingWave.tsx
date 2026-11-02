import { StyleSheet, View } from 'react-native';

import { colors } from './theme';

const LEFT = [6, 10, 8, 14, 20, 16, 26, 22, 34, 30, 42, 38, 52, 46, 60, 70];
const RIGHT = [64, 54, 58, 44, 50, 36, 40, 28, 32, 22, 18, 24, 14, 10, 12, 6];

export function MeetingWave({ height = 120 }: { height?: number }) {
  const scale = height / 100;
  const bars = [
    ...LEFT.map((value) => ({ value, color: colors.accent })),
    { value: 100, color: colors.highlight },
    ...RIGHT.map((value) => ({ value, color: colors.text })),
  ];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.row, { height }]}>
      {bars.map((bar, index) => (
        <View key={index} style={[styles.bar, { height: bar.value * scale, backgroundColor: bar.color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bar: { flex: 1, borderRadius: 99 },
});
