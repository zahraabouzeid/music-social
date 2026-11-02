import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, contentWidth, space } from './theme';

type Props = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  insetTop?: boolean;
};

export function Screen({ children, refreshing = false, onRefresh, scroll = true, insetTop = true }: Props) {
  const body = <View style={styles.column}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={insetTop ? ['top'] : []}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingBottom: 96 },
  column: {
    width: '100%',
    maxWidth: contentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.lg,
  },
});
