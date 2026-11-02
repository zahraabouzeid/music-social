import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './theme';

type Props = {
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: 'empty' | 'error';
};

export function Notice({ title, body, action, tone = 'empty' }: Props) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.box, tone === 'error' && styles.error]}
    >
      <Text variant="heading">{title}</Text>
      {body ? <Text color={colors.muted}>{body}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    padding: space.xl,
    gap: space.sm,
    alignItems: 'flex-start',
  },
  error: { borderStyle: 'solid', borderColor: colors.red, backgroundColor: '#FDECEE' },
});
