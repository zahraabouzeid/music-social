import { View, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors } from './theme';

const GROUNDS = ['#3B1E54', '#1E3A5F', '#4A1C2C', '#1F4A3F', '#47361A', '#2B2B5E'];
const BAR_COUNT = 21;

function hash(seed: string) {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}

function random(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000) / 1000;
  };
}

type Props = {
  seed: string;
  style?: ViewStyle;
  aspectRatio?: number;
};

export function Cover({ seed, style, aspectRatio = 1 }: Props) {
  const value = hash(seed);
  const next = random(value);
  const ground = GROUNDS[value % GROUNDS.length];
  const heights = Array.from({ length: BAR_COUNT }, (_, index) => {
    const envelope = Math.sin(((index + 0.5) / BAR_COUNT) * Math.PI);
    return 0.12 + envelope * (0.35 + next() * 0.5);
  });
  const peak = heights.indexOf(Math.max(...heights));
  const width = 100;
  const height = width / aspectRatio;
  const slot = width / BAR_COUNT;

  return (
    <View style={[{ aspectRatio, borderRadius: 12, overflow: 'hidden', backgroundColor: ground }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} accessibilityElementsHidden>
        {heights.map((bar, index) => {
          const barHeight = bar * height * 0.8;
          return (
            <Rect
              key={index}
              x={index * slot + slot * 0.22}
              y={(height - barHeight) / 2}
              width={slot * 0.56}
              height={barHeight}
              rx={slot * 0.28}
              fill={index === peak ? colors.highlight : colors.text}
              opacity={index === peak ? 1 : 0.85}
            />
          );
        })}
      </Svg>
    </View>
  );
}
