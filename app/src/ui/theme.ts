export const colors = {
  bg: '#0B0B0C',
  surface: '#1C1C1E',
  raised: '#2C2C2E',
  line: '#38383A',
  text: '#FFFFFF',
  muted: '#A1A1A6',
  faint: '#636366',
  accent: '#FA2D48',
  accentSoft: '#FB5C74',
  onAccent: '#FFFFFF',
  highlight: '#FFD60A',
  onHighlight: '#1C1C1E',
  dangerSurface: '#3A1218',
} as const;

export const fonts = {
  brand: 'BricolageGrotesque_800ExtraBold',
  display: 'Figtree_800ExtraBold',
  displayMedium: 'Figtree_700Bold',
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
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  lead: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  number: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
} as const;

export const contentWidth = 640;
