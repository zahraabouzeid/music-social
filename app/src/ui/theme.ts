export const colors = {
  ink: '#1E1433',
  inkSoft: '#2E2347',
  paper: '#ECEAF3',
  card: '#FFFFFF',
  line: '#D8D4E4',
  muted: '#6B6480',
  red: '#E5233D',
  yellow: '#FFC93C',
  onInk: '#F6F3FF',
  onInkMuted: '#A99FC4',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodyBold: 'Figtree_700Bold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  pill: 999,
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  number: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -0.5 },
} as const;

export const contentWidth = 640;
