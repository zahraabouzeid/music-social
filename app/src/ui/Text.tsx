import { Text as RNText, TextProps } from 'react-native';

import { colors, type } from './theme';

type Variant = keyof typeof type;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

export function Text({ variant = 'body', color = colors.ink, style, ...rest }: Props) {
  return <RNText {...rest} style={[type[variant], { color }, style]} />;
}
