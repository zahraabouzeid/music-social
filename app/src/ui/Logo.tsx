import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { brand } from '@/brand';

import { Text } from './Text';
import { colors, fonts } from './theme';

const BAR_WIDTH = 6.8;
const BAR_GAP = 1.9;
const HEIGHTS = [18, 32, 42, 54, 36, 46, 24];
const FILLS = [colors.accent, colors.accent, colors.accent, colors.highlight, colors.text, colors.text, colors.text];
const START = (64 - (HEIGHTS.length * BAR_WIDTH + (HEIGHTS.length - 1) * BAR_GAP)) / 2;

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden>
      {HEIGHTS.map((height, index) => (
        <Rect
          key={index}
          x={START + index * (BAR_WIDTH + BAR_GAP)}
          y={(64 - height) / 2}
          width={BAR_WIDTH}
          height={height}
          rx={BAR_WIDTH / 2}
          fill={FILLS[index]}
        />
      ))}
    </Svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={brand.name}>
      <LogoMark size={size * 1.35} />
      <Text style={{ fontFamily: fonts.brand, fontSize: size, lineHeight: size * 1.1, letterSpacing: -size * 0.04 }}>
        {brand.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
