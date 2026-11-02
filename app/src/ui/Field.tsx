import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { Text } from './Text';
import { colors, fonts, radius, space } from './theme';

type Props = TextInputProps & {
  label: string;
};

export function Field({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        {...rest}
        style={[styles.input, rest.multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 96, paddingTop: space.md, textAlignVertical: 'top' },
});
