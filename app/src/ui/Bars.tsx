import { StyleSheet, View } from 'react-native';

import { colors } from './theme';

type Props = {
  values: number[];
  height: number;
  label: string;
  peakColor?: string;
  baseColor?: string;
};

export function Bars({ values, height, label, peakColor = colors.yellow, baseColor = colors.red }: Props) {
  const max = Math.max(1, ...values);
  const peak = values.indexOf(max);
  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={[styles.row, { height }]}>
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: Math.max(3, (value / max) * height),
              backgroundColor: index === peak ? peakColor : baseColor,
              opacity: value === 0 ? 0.35 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { flex: 1, borderRadius: 3, minWidth: 2 },
});
