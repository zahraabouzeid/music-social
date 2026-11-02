import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

type Props = {
  style?: StyleProp<ViewStyle>;
  radius: number;
  children?: ReactNode;
};

export function GlassSurface({ style, radius, children }: Props) {
  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" isInteractive style={[{ borderRadius: radius }, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.shell, { borderRadius: radius }, style]}>
      {Platform.OS === 'android' ? (
        <View style={[StyleSheet.absoluteFill, styles.solid]} />
      ) : (
        <BlurView tint="systemChromeMaterialDark" intensity={70} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="glass-sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.14} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.03} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glass-sheen)" />
      </Svg>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { borderRadius: radius }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  solid: { backgroundColor: 'rgba(30, 30, 33, 0.94)' },
  tint: { backgroundColor: 'rgba(28, 28, 30, 0.2)' },
  edge: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255, 255, 255, 0.16)' },
});
