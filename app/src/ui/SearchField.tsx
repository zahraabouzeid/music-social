import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { Icon } from './Icon';
import { colors, fonts, radius, space } from './theme';

export function SearchField(props: TextInputProps) {
  return (
    <View style={styles.wrap}>
      <Icon name="search" size={20} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize="none"
        {...props}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 16, color: colors.text },
});
