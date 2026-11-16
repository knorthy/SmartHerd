import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useSaleWeight } from '@/lib/herd';
import { makeStyles, S, useTheme } from '@/theme';

/**
 * The measuring tape: weight laid on a kilogram scale with the sale weight notched in ochre.
 * `compact` is the hairline strip used in lists; the full tape carries labelled graduations.
 */
export function Tape({ kg, compact, edge, animate }: { kg: number | null; compact?: boolean; edge?: boolean; animate?: boolean }) {
  const saleKg = useSaleWeight();
  const { C } = useTheme();
  const st = useSt();
  const max = compact || edge ? saleKg * 1.4 : Math.max(50, Math.ceil(((kg ?? 0) * 1.15) / 10) * 10);
  const p = kg === null ? 0 : Math.min(1, kg / max);
  const ready = kg !== null && kg >= saleKg;
  const salePct = `${(saleKg / max) * 100}%` as const;

  const reduce = useReducedMotion();
  const fill = useSharedValue(animate && !reduce ? 0 : p);
  useEffect(() => {
    fill.set(animate && !reduce ? withTiming(p, { duration: 900, easing: Easing.out(Easing.exp) }) : p);
  }, [p, animate, reduce, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  const markerStyle = useAnimatedStyle(() => ({ left: `${fill.get() * 100}%` }));

  // edge: the tape is the base of a tile, full-bleed along its bottom
  if (edge) {
    return (
      <View style={st.eTrack} accessible={false}>
        <View style={[st.cFill, { width: `${p * 100}%`, backgroundColor: ready ? C.ochre : C.green }]} />
        <View style={[st.eSale, { left: salePct }]} />
      </View>
    );
  }

  if (compact) {
    return (
      <View style={st.cTrack} accessible={false}>
        <View style={[st.cFill, { width: `${p * 100}%`, backgroundColor: ready ? C.ochre : C.green }]} />
        <View style={[st.cSale, { left: salePct }]} />
      </View>
    );
  }

  const majors = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10);
  const minors = Array.from({ length: max / 2 + 1 }, (_, i) => i * 2);
  return (
    <View accessible accessibilityLabel={`${kg ?? 0} kilograms on a scale to ${max}; sale weight ${saleKg}`}>
      <View style={st.scale}>
        {minors.map((v) => (
          <View key={v} style={[st.tick, { left: `${(v / max) * 100}%`, height: v % 10 === 0 ? 14 : v % 5 === 0 ? 9 : 5 }]} />
        ))}
        <View style={st.baseline} />
        <Animated.View style={[st.fill, { backgroundColor: ready ? C.ochre : C.green }, fillStyle]} />
        <View style={[st.sale, { left: salePct }]} />
        <Animated.View style={[st.marker, markerStyle]}>
          <View style={[st.markerLine, { backgroundColor: ready ? C.ochre : C.green }]} />
        </Animated.View>
      </View>
      <View style={st.labels}>
        {majors.map((v) => (
          <Text key={v} style={[st.label, { left: `${(v / max) * 100}%` }, v === saleKg && { color: C.ochre, fontWeight: '700' }]}>
            {v}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useSt = makeStyles((C) => StyleSheet.create({
  cTrack: { height: 3, backgroundColor: C.rule, marginTop: S.xs + 2 },
  eTrack: { height: 5, backgroundColor: C.surface2 },
  eSale: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: C.ochre },
  cFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  cSale: { position: 'absolute', top: -3, width: 1.5, height: 9, backgroundColor: C.ochre },
  scale: { height: 30, justifyContent: 'flex-end' },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: C.ink },
  tick: { position: 'absolute', bottom: 0, width: 1, backgroundColor: C.ink2 },
  fill: { position: 'absolute', left: 0, bottom: 0, height: 4 },
  sale: { position: 'absolute', bottom: 0, width: 2, height: 22, marginLeft: -1, backgroundColor: C.ochre },
  marker: { position: 'absolute', bottom: 0, top: 0, width: 0 },
  markerLine: { position: 'absolute', left: -1, top: 0, bottom: 0, width: 2 },
  labels: { height: 18, marginTop: 4 },
  label: { position: 'absolute', width: 32, marginLeft: -16, textAlign: 'center', fontSize: 11, color: C.ink2, fontVariant: ['tabular-nums'] },
}));
