import { StyleSheet, useColorScheme } from 'react-native';

import { useHerd } from '@/lib/herd';

/** Extension Bulletin palette. Light: white page and ink. Dark: the same bulletin read under a lamp at night. */
const light = {
  paper: '#F2F5F3',
  surface: '#FFFFFF',
  surface2: '#E8EEEA',
  ink: '#111614',
  ink2: '#4A5651',
  rule: '#D9E4DE',
  green: '#0F5C45',
  onGreen: '#FFFFFF',
  hero: '#0F5C45',
  // accent on the inverted (ink) snackbar
  inverseAccent: '#7FD3AF',
  onHero: '#FFFFFF',
  greenPressed: '#0B4634',
  greenTint: '#E7EFEA',
  ochre: '#8A5710',
  ochreTint: '#F6EBD3',
  error: '#A3302A',
  glass: 'rgba(255, 255, 255, 0.55)',
  glassSolid: 'rgba(255, 255, 255, 0.92)',
  glassEdge: 'rgba(17, 22, 20, 0.12)',
  scrim: 'rgba(8, 14, 11, 0.72)',
};

export type Palette = typeof light;

const dark: Palette = {
  paper: '#0A0E0C',
  surface: '#141B18',
  surface2: '#1D2621',
  ink: '#E6ECE8',
  ink2: '#9DABA4',
  rule: '#27322D',
  green: '#5CC29A',
  onGreen: '#06120D',
  hero: '#123B2E',
  inverseAccent: '#0F5C45',
  onHero: '#E6F3EC',
  greenPressed: '#49A883',
  greenTint: '#16261F',
  ochre: '#E2AA4E',
  ochreTint: '#2B2214',
  error: '#F08074',
  glass: 'rgba(20, 28, 25, 0.55)',
  glassSolid: 'rgba(20, 28, 25, 0.94)',
  glassEdge: 'rgba(230, 236, 232, 0.14)',
  scrim: 'rgba(0, 0, 0, 0.74)',
};

export type ThemePref = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Corner radii: tiles and inputs, grouped panels, large hero panels. */
export const R = { sm: 12, md: 18, lg: 26 } as const;

const tab = ['tabular-nums'] as const;

function typeFor(C: Palette) {
  return StyleSheet.create({
    display: { fontSize: 56, lineHeight: 60, fontWeight: '700', letterSpacing: -1.5, color: C.ink, fontVariant: [...tab] },
    title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8, color: C.ink },
    heading: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2, color: C.ink },
    body: { fontSize: 16, lineHeight: 22, color: C.ink },
    bodyNum: { fontSize: 16, lineHeight: 22, color: C.ink, fontVariant: [...tab] },
    meta: { fontSize: 14, lineHeight: 20, color: C.ink2 },
    label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: C.ink2 },
    caption: { fontSize: 12, lineHeight: 16, color: C.ink2, fontStyle: 'italic' },
  });
}

const THEMES = {
  light: { scheme: 'light' as Scheme, C: light, T: typeFor(light) },
  dark: { scheme: 'dark' as Scheme, C: dark, T: typeFor(dark) },
};

export type Theme = (typeof THEMES)[Scheme];

export function useTheme(): Theme {
  const system = useColorScheme();
  const { theme = 'system' } = useHerd();
  const scheme: Scheme = theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;
  return THEMES[scheme];
}

/** Module-level styles that follow the theme: built once per scheme, then cached. */
export function makeStyles<R>(build: (C: Palette) => R) {
  const cache: Partial<Record<Scheme, R>> = {};
  return function useStyles(): R {
    const { scheme, C } = useTheme();
    return (cache[scheme] ??= build(C));
  };
}
