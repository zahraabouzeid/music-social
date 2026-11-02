import { View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from './theme';

const GROUNDS: [string, string][] = [
  ['#FA2D48', '#6E0E24'],
  ['#5856D6', '#1C1A55'],
  ['#0A84FF', '#08295C'],
  ['#AF52DE', '#3A1257'],
  ['#E8590C', '#5C2004'],
  ['#30A46C', '#0D3622'],
];
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
  const [from, to] = GROUNDS[value % GROUNDS.length];
  const gradientId = `cover-${value}`;
  const heights = Array.from({ length: BAR_COUNT }, (_, index) => {
    const envelope = Math.sin(((index + 0.5) / BAR_COUNT) * Math.PI);
    return 0.12 + envelope * (0.35 + next() * 0.5);
  });
  const peak = heights.indexOf(Math.max(...heights));
  const width = 100;
  const height = width / aspectRatio;
  const slot = width / BAR_COUNT;

  return (
    <View style={[{ aspectRatio, borderRadius: 8, overflow: 'hidden', backgroundColor: to }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} accessibilityElementsHidden>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gradientId})`} />
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
              fill={colors.text}
              opacity={index === peak ? 1 : 0.6}
            />
          );
        })}
      </Svg>
    </View>
  );
}
