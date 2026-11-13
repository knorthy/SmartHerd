import { StyleSheet } from 'react-native';

/** Extension Bulletin palette: white page, ink, one green second colour, ochre only for "at sale weight". */
export const C = {
  paper: '#FFFFFF',
  ink: '#111614',
  ink2: '#4A5651',
  rule: '#D9E4DE',
  green: '#0F5C45',
  greenPressed: '#0B4634',
  greenTint: '#E7EFEA',
  ochre: '#8A5710',
  ochreTint: '#F6EBD3',
  error: '#A3302A',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

const tab = ['tabular-nums'] as const;

export const T = StyleSheet.create({
  display: { fontSize: 56, lineHeight: 60, fontWeight: '700', letterSpacing: -1.5, color: C.ink, fontVariant: [...tab] },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, color: C.ink },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: C.ink },
  body: { fontSize: 16, lineHeight: 22, color: C.ink },
  bodyNum: { fontSize: 16, lineHeight: 22, color: C.ink, fontVariant: [...tab] },
  meta: { fontSize: 14, lineHeight: 20, color: C.ink2 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: C.ink2 },
  caption: { fontSize: 12, lineHeight: 16, color: C.ink2, fontStyle: 'italic' },
});
