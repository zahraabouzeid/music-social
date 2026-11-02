import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';

import type { Listening } from '@/api/types';
import { Avatar, Text, colors, radius, space } from '@/ui';

export function NowPlayingStrip({ listening }: { listening: Listening[] }) {
  if (listening.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {listening.map((entry) => (
        <View
          key={entry.username}
          style={styles.pill}
          accessibilityLabel={`${entry.display_name} is playing ${entry.title} by ${entry.artist}`}
        >
          <Avatar name={entry.display_name} seed={entry.username} size={28} />
          <View style={{ maxWidth: 200 }}>
            <Text variant="small" numberOfLines={1}>
              {entry.title}
            </Text>
            <Text variant="small" color={colors.muted} numberOfLines={1}>
              {entry.artist}
            </Text>
          </View>
          <Equalizer />
        </View>
      ))}
    </ScrollView>
  );
}

export function Equalizer() {
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current;
  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      bars.forEach((bar, index) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: 1, duration: 320 + index * 90, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(bar, { toValue: 0.3, duration: 300 + index * 70, useNativeDriver: Platform.OS !== 'web' }),
          ]),
        );
        loops.push(loop);
        loop.start();
      });
    });
    return () => loops.forEach((loop) => loop.stop());
  }, [bars]);
  return (
    <View style={styles.eq} accessibilityElementsHidden>
      {bars.map((bar, index) => (
        <Animated.View key={index} style={[styles.eqBar, { transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: space.xs + 2,
    paddingLeft: space.xs + 2,
    paddingRight: space.md,
  },
  eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 },
  eqBar: { width: 3, height: 14, borderRadius: 1.5, backgroundColor: colors.accent },
});
