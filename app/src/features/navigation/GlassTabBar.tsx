import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface, Text, colors, fonts, space } from '@/ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_HEIGHT = 64;
const MAX_WIDTH = 520;
const INSET = 6;

export function GlassTabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const [width, setWidth] = useState(0);
  const slot = width > 0 ? (width - INSET * 2) / state.routes.length : 0;
  const position = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: Platform.OS !== 'web',
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [state.index, position]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <GlassSurface radius={BAR_HEIGHT / 2} style={styles.bar}>
        <View style={styles.row} onLayout={onLayout} accessibilityRole="tablist">
          {slot > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.bubble, { width: slot, transform: [{ translateX: Animated.multiply(position, slot) }] }]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = typeof options.title === 'string' ? options.title : route.name;
            const badge = options.tabBarBadge;

            const onPress = () => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                navigateToTab(route.key);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
                onPress={onPress}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                style={styles.item}
              >
                <View>
                  {options.tabBarIcon?.({ focused, color: focused ? colors.text : colors.muted, size: 24 })}
                  {badge !== undefined ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{String(badge)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, { color: focused ? colors.text : colors.muted }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  bar: { width: '100%', maxWidth: MAX_WIDTH, height: BAR_HEIGHT },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: INSET },
  bubble: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    bottom: INSET,
    borderRadius: (BAR_HEIGHT - INSET * 2) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 12 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.onAccent },
});
