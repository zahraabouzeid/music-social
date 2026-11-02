import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text, space } from '@/ui';

export function Shelf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text variant="heading">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  row: { gap: space.lg, paddingRight: space.lg },
});
