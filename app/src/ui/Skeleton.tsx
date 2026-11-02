import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, space } from './theme';

function usePulse() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);
  return opacity;
}

export function Block({ style }: { style: ViewStyle }) {
  return <View style={[styles.block, style]} />;
}

export function Skeleton({ children, label = 'Loading' }: { children: React.ReactNode; label?: string }) {
  const opacity = usePulse();
  return (
    <Animated.View accessibilityRole="progressbar" accessibilityLabel={label} style={{ opacity, gap: space.lg }}>
      {children}
    </Animated.View>
  );
}

export function PostSkeleton() {
  return (
    <View style={styles.post}>
      <View style={styles.row}>
        <Block style={styles.avatar} />
        <View style={{ gap: space.xs, flex: 1 }}>
          <Block style={{ width: '40%', height: 14 }} />
          <Block style={{ width: '20%', height: 12 }} />
        </View>
      </View>
      <Block style={{ width: '100%', aspectRatio: 1.6, borderRadius: radius.md }} />
      <Block style={{ width: '55%', height: 22 }} />
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Block style={styles.avatar} />
      <View style={{ gap: space.xs, flex: 1 }}>
        <Block style={{ width: '50%', height: 14 }} />
        <Block style={{ width: '30%', height: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.raised, borderRadius: radius.sm },
  post: { gap: space.md, paddingVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20 },
});
