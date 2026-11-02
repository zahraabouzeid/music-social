import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.active]}
          >
            <Text variant="small" color={active ? colors.onAccent : colors.text}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  chip: {
    paddingVertical: space.sm - 1,
    paddingHorizontal: space.lg - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
  },
  active: { backgroundColor: colors.accent },
});
