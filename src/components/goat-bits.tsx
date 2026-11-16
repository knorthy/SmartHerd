import { StyleSheet, Text, View } from 'react-native';

import { daysToSale, latest, type Goat } from '@/lib/herd';
import { makeStyles, useTheme } from '@/theme';

export type SaleStatus = { kind: 'ready' | 'soon' | 'later' | 'pending' | 'none'; label: string; spoken: string; days: number | null };

/** One wording for a goat's sale status everywhere it appears. */
export function saleStatus(g: Goat): SaleStatus {
  const w = latest(g);
  const d = daysToSale(g);
  if (!w) return { kind: 'none', label: 'Not weighed', spoken: 'not weighed yet', days: null };
  if (d === 0) return { kind: 'ready', label: 'Ready', spoken: 'at sale weight', days: 0 };
  if (d === null) return { kind: 'pending', label: 'Needs 2nd weighing', spoken: 'needs a second weighing to project its sale date', days: null };
  return { kind: d <= 30 ? 'soon' : 'later', label: `${d} days`, spoken: `about ${d} days to sale weight`, days: d };
}

/** The goat's ear tag, drawn as a tag: a punched hole above the number. */
export function EarTag({ tag, ready }: { tag: string; ready?: boolean }) {
  const { C } = useTheme();
  const st = useSt();
  const bg = ready ? C.ochre : C.greenTint;
  const fg = ready ? C.surface : C.green;
  return (
    <View style={[st.tag, { backgroundColor: bg }]} accessibilityLabel={`Tag ${tag}`}>
      <View style={[st.hole, { backgroundColor: C.surface }]} />
      <Text style={[st.text, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {tag}
      </Text>
    </View>
  );
}

const useSt = makeStyles(() =>
  StyleSheet.create({
    tag: {
      width: 56,
      height: 60,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 9,
      paddingHorizontal: 4,
    },
    hole: { position: 'absolute', top: 8, width: 10, height: 10, borderRadius: 5 },
    text: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  }),
);
