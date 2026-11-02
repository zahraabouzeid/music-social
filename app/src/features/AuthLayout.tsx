import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Bars, Screen, Text, colors, space } from '@/ui';

const signature = [3, 5, 8, 4, 9, 12, 7, 10, 14, 9, 6, 11, 16, 12, 8, 5, 9, 13, 10, 6, 4, 7, 5, 3];

export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Bars values={signature} height={72} label="" />
          <Text variant="hero" color={colors.text}>
            {title}
          </Text>
          <Text color={colors.muted}>{intro}</Text>
        </View>
        <View style={styles.form}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.raised,
    borderRadius: 22,
    padding: space.xl,
    paddingTop: space.xxl,
    gap: space.md,
  },
  form: { gap: space.lg },
});
