import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SideDiagram, TopDiagram } from '@/components/diagrams';
import { LogoMark } from '@/components/logo';
import { Tape } from '@/components/tape';
import { Button } from '@/components/ui';
import { SALE_WEIGHT_KG } from '@/lib/estimate';
import { loadDemoHerd, setOnboarded, useHerd } from '@/lib/herd';
import { C, S, T } from '@/theme';

type Page = { title: string; body: string; art: React.ReactNode; caption?: string };

const PAGES: Page[] = [
  {
    title: 'Weigh your herd without a scale.',
    body: 'SmartHerd estimates a goat’s live weight from two photos. No scale, no restraint, and no signal needed in the pen.',
    art: (
      <View style={{ alignItems: 'center', gap: S.lg }}>
        <LogoMark size={120} />
        <Text style={[T.title, { color: C.green, letterSpacing: -0.2 }]}>SmartHerd</Text>
      </View>
    ),
  },
  {
    title: 'Take two photos.',
    body: 'One from the side, level with the flank. One from above, head to tail. Keep the whole goat in frame for both.',
    art: (
      <View style={{ alignItems: 'center', gap: S.md }}>
        <SideDiagram width={280} />
        <TopDiagram width={220} />
      </View>
    ),
    caption: 'Fig. 1 and 2 — the side and top views',
  },
  {
    title: 'Read the Estimated Weight.',
    body: 'Body length, chest height and chest width give the heart girth. Schaeffer’s formula turns those into kilograms. It is an estimate, so weigh often and watch the trend.',
    art: (
      <View style={{ width: '100%', maxWidth: 320, gap: S.md }}>
        <Text style={T.label}>Estimated Weight</Text>
        <Text style={T.display}>
          27.4<Text style={{ fontSize: 24, color: C.ink2 }}> kg</Text>
        </Text>
        <Tape kg={27.4} animate />
      </View>
    ),
    caption: 'Example only — the ochre mark is the 30 kg sale weight',
  },
  {
    title: 'Know who is ready to sell.',
    body: `The sale board ranks your cooperative’s goats by days to ${SALE_WEIGHT_KG} kg. Records stay on this phone and sync when you are online.`,
    art: <BoardSketch />,
  },
];

export default function Welcome() {
  const [i, setI] = useState(0);
  const { goats } = useHerd();
  const reduce = useReducedMotion();
  const page = PAGES[i];
  const last = i === PAGES.length - 1;

  return (
    <SafeAreaView style={st.root}>
      <View style={st.top}>
        <Steps i={i} n={PAGES.length} />
        {!last && (
          <Pressable accessibilityRole="button" onPress={() => setOnboarded(true)} hitSlop={12} style={st.skip}>
            <Text style={[T.label, { color: C.green }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={st.body}>
        <Animated.View key={i} entering={reduce ? undefined : FadeIn.duration(320)} exiting={reduce ? undefined : FadeOut.duration(120)} style={st.page}>
          <View style={st.art}>
            {page.art}
            {page.caption && <Text style={[T.caption, { marginTop: S.md }]}>{page.caption}</Text>}
          </View>
          <Text style={st.title} accessibilityRole="header">
            {page.title}
          </Text>
          <Text style={st.copy}>{page.body}</Text>
        </Animated.View>
      </ScrollView>

      <View style={st.footer}>
        {last ? (
          <>
            <Button label="Start with my herd" onPress={() => setOnboarded(true)} />
            {goats.length === 0 && <Button label="Explore with demo goats" variant="text" onPress={loadDemoHerd} />}
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: S.md }}>
            {i > 0 && <Button label="Back" variant="outlined" onPress={() => setI(i - 1)} style={{ flex: 1 }} />}
            <Button label="Next" onPress={() => setI(i + 1)} style={{ flex: 2 }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Progress as a dimension line: one graduated segment per page, filled up to the current one. */
function Steps({ i, n }: { i: number; n: number }) {
  return (
    <View style={st.steps} accessibilityLabel={`Step ${i + 1} of ${n}`} accessibilityRole="progressbar">
      <View style={st.tick} />
      {Array.from({ length: n }, (_, k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[st.seg, { backgroundColor: k <= i ? C.green : C.rule }]} />
          <View style={[st.tick, { backgroundColor: k <= i ? C.green : C.ink2 }]} />
        </View>
      ))}
    </View>
  );
}

function BoardSketch() {
  const rows: [string, string, number, string][] = [
    ['T-014', 'Bituin', 32.4, 'Ready'],
    ['T-017', 'Ligaya', 26.6, '15 d'],
    ['T-030', 'Kidlat', 15.8, '62 d'],
  ];
  return (
    <View style={{ width: '100%', maxWidth: 340, borderTopWidth: 1, borderTopColor: C.ink }}>
      {rows.map(([tag, name, w, s]) => {
        const ready = s === 'Ready';
        return (
          <View key={tag} style={[st.sRow, ready && { backgroundColor: C.ochreTint }]}>
            <Text style={[T.meta, { width: 52, fontVariant: ['tabular-nums'] }]}>{tag}</Text>
            <View style={{ flex: 1, paddingRight: S.md }}>
              <Text style={[T.body, { fontWeight: '600' }]}>{name}</Text>
              <Tape kg={w} compact />
            </View>
            <Text style={[T.bodyNum, { width: 44, textAlign: 'right' }]}>{w}</Text>
            <Text style={[T.bodyNum, { width: 56, textAlign: 'right' }, ready && { color: C.ochre, fontWeight: '700' }]}>{s}</Text>
          </View>
        );
      })}
      <Text style={[T.caption, { marginTop: S.md, textAlign: 'center' }]}>Example rows</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.lg, paddingHorizontal: S.lg, paddingTop: S.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: S.xs },
  steps: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 48 },
  seg: { flex: 1, height: 2 },
  tick: { width: 1.5, height: 10, backgroundColor: C.green },
  body: { flexGrow: 1, paddingHorizontal: S.xl, paddingVertical: S.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  page: { flex: 1, justifyContent: 'center', gap: S.lg },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: 300, paddingBottom: S.lg, marginBottom: S.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, color: C.ink },
  copy: { fontSize: 17, lineHeight: 25, color: C.ink2, maxWidth: 440 },
  footer: { padding: S.lg, gap: S.sm, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: S.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
});
