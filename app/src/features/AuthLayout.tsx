import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { MeetingWave, Screen, Text, Wordmark, colors, space } from '@/ui';

export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.brand}>
          <Wordmark size={22} />
        </View>
        <View style={styles.wave}>
          <MeetingWave height={96} />
        </View>
        <View style={styles.heading}>
          <Text variant="hero">{title}</Text>
          <Text color={colors.muted}>{intro}</Text>
        </View>
        <View style={styles.form}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { paddingTop: space.lg },
  wave: { paddingVertical: space.xl },
  heading: { gap: space.sm, paddingBottom: space.md },
  form: { gap: space.lg },
});
