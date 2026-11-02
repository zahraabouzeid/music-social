import {
  CaretRight,
  ChatCircle,
  Compass,
  Heart,
  House,
  MagnifyingGlass,
  PaperPlaneRight,
  Plus,
  SlidersHorizontal,
  Trophy,
  UploadSimple,
  type Icon as PhosphorIcon,
} from 'phosphor-react-native';

import { colors } from './theme';

const glyphs = {
  feed: House,
  discover: Compass,
  boards: Trophy,
  plus: Plus,
  heart: Heart,
  settings: SlidersHorizontal,
  upload: UploadSimple,
  search: MagnifyingGlass,
  chevron: CaretRight,
  chat: ChatCircle,
  send: PaperPlaneRight,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof glyphs;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function Icon({ name, size = 24, color = colors.text, filled = false }: Props) {
  const Glyph = glyphs[name];
  return <Glyph size={size} color={color} weight={filled ? 'fill' : 'regular'} />;
}
