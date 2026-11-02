import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from './theme';

export type IconName =
  'feed' | 'discover' | 'boards' | 'plus' | 'heart' | 'settings' | 'upload' | 'search' | 'chevron' | 'chat' | 'send';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function Icon({ name, size = 24, color = colors.text, filled = false }: Props) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fill = filled ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      {name === 'feed' ? (
        <>
          <Path d="M4 6h16" {...stroke} />
          <Path d="M4 12h10" {...stroke} />
          <Path d="M4 18h13" {...stroke} />
          <Circle cx={19} cy={12} r={1.6} fill={color} />
        </>
      ) : null}
      {name === 'discover' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" {...stroke} fill={fill} />
        </>
      ) : null}
      {name === 'boards' ? (
        <>
          <Path d="M4 20v-6h5v6" {...stroke} fill={fill} />
          <Path d="M9 20V8h6v12" {...stroke} fill={fill} />
          <Path d="M15 20v-9h5v9" {...stroke} fill={fill} />
          <Path d="M3 20h18" {...stroke} />
        </>
      ) : null}
      {name === 'plus' ? (
        <>
          <Path d="M12 5v14" {...stroke} />
          <Path d="M5 12h14" {...stroke} />
        </>
      ) : null}
      {name === 'heart' ? (
        <Path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" {...stroke} fill={fill} />
      ) : null}
      {name === 'settings' ? (
        <>
          <Path d="M4 7h10" {...stroke} />
          <Path d="M18 7h2" {...stroke} />
          <Circle cx={16} cy={7} r={2} {...stroke} />
          <Path d="M4 17h2" {...stroke} />
          <Path d="M10 17h10" {...stroke} />
          <Circle cx={8} cy={17} r={2} {...stroke} />
        </>
      ) : null}
      {name === 'upload' ? (
        <>
          <Path d="M12 15V4" {...stroke} />
          <Path d="M7.5 8.5L12 4l4.5 4.5" {...stroke} />
          <Path d="M5 15v4h14v-4" {...stroke} />
        </>
      ) : null}
      {name === 'chevron' ? <Path d="M9 5l7 7-7 7" {...stroke} /> : null}
      {name === 'chat' ? (
        <Path d="M5 5h14a1 1 0 011 1v10a1 1 0 01-1 1H10l-5 4V6a1 1 0 011-1z" {...stroke} fill={fill} />
      ) : null}
      {name === 'send' ? <Path d="M4 12l16-8-6 16-2.5-6.5L4 12z" {...stroke} fill={fill} /> : null}
      {name === 'search' ? (
        <>
          <Circle cx={11} cy={11} r={6.5} {...stroke} />
          <Path d="M16 16l4 4" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}
