import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SideDiagram } from '@/components/diagrams';
import { EarTag, saleStatus, type SaleStatus } from '@/components/goat-bits';
import { TabScreen } from '@/components/screen';
import { SyncStatus } from '@/components/sync-status';
import { Tape } from '@/components/tape';
import { TourTarget } from '@/components/tour-target';
import { Button, Empty, Panel, Section } from '@/components/ui';
import { ago, cm, kg, stageLabel } from '@/lib/format';
import { latest, loadDemoHerd, rankForSale, useHerd, useSaleWeight, type Goat } from '@/lib/herd';
import { makeStyles, R, S, useTheme } from '@/theme';

const PREVIEW = 8;

export default function SaleBoard() {
  const { T } = useTheme();
  const st = useSt();
  const { goats } = useHerd();
  const [showAll, setShowAll] = useState(false);
  const ranked = rankForSale(goats);
  const shown = showAll ? ranked : ranked.slice(0, PREVIEW);
  const lastGoat = goats
    .filter((g) => latest(g))
    .sort((a, b) => latest(b)!.at - latest(a)!.at)[0];

  return (
    <TabScreen
      title="Sale board"
      status={
        <TourTarget id="sync">
          <SyncStatus />
        </TourTarget>
      }>
      {goats.length === 0 ? (
        <TourTarget id="board-main">
          <Panel style={{ alignItems: 'center', paddingVertical: S.xl, gap: S.sm }}>
            <SideDiagram width={300} />
            <Text style={T.caption}>What SmartHerd measures from a side photo</Text>
          </Panel>
          <Empty
            title="No goats on the board yet"
            body="Register your cooperative's goats, then weigh each one from two photos. No scale, no restraint, no signal needed."
            action={
              <View style={{ gap: S.sm }}>
                <Button label="Register a goat" onPress={() => router.push('/goat/new')} />
                <Button label="Load demo herd" variant="text" onPress={loadDemoHerd} />
              </View>
            }
          />
        </TourTarget>
      ) : (
        <>
          <HerdGlance goats={goats} />

          <Section title="Ranked for sale" aside={goats.some((g) => g.demo) ? 'Demo data' : `${goats.length} goats`} style={st.block} bare>
            <View accessibilityRole="list" style={{ gap: S.sm }}>
              <TourTarget id="board-main" style={{ gap: S.sm }}>
                {shown.slice(0, 2).map((g) => (
                  <GoatTile key={g.id} goat={g} />
                ))}
              </TourTarget>
              {shown.slice(2).map((g) => (
                <GoatTile key={g.id} goat={g} />
              ))}
            </View>
            {ranked.length > PREVIEW && (
              <Button
                label={showAll ? 'Show top 8' : `Show all ${ranked.length} goats`}
                variant="text"
                onPress={() => setShowAll(!showAll)}
                style={{ alignSelf: 'center', marginTop: S.sm }}
              />
            )}
          </Section>

          {lastGoat && <LastWeighing goat={lastGoat} />}
        </>
      )}
    </TabScreen>
  );
}

const ORDER: SaleStatus['kind'][] = ['ready', 'soon', 'later', 'pending', 'none'];
const LABEL: Record<SaleStatus['kind'], string> = {
  ready: 'Ready',
  soon: 'Within 30 days',
  later: 'Later',
  pending: 'Needs 2nd weighing',
  none: 'Not weighed',
};

/** The herd by sale status: one proportional bar and its counts. Holds for 6 goats or 600. */
function HerdGlance({ goats }: { goats: Goat[] }) {
  const { C } = useTheme();
  const st = useSt();
  const saleKg = useSaleWeight();
  const counts = Object.fromEntries(ORDER.map((k) => [k, 0])) as Record<SaleStatus['kind'], number>;
  for (const g of goats) counts[saleStatus(g).kind]++;
  const ready = counts.ready;
  const tone: Record<SaleStatus['kind'], { bg: string; o: number }> = {
    ready: { bg: C.ochre, o: 1 },
    soon: { bg: C.onHero, o: 0.85 },
    later: { bg: C.onHero, o: 0.45 },
    pending: { bg: C.onHero, o: 0.25 },
    none: { bg: C.onHero, o: 0.12 },
  };
  const present = ORDER.filter((k) => counts[k] > 0);
  return (
    <View
      style={st.glance}
      accessible
      accessibilityLabel={`${ready} of ${goats.length} goats ready to sell. ${present.map((k) => `${counts[k]} ${LABEL[k]}`).join(', ')}`}>
      <Text style={st.glanceTitle}>
        {ready === 0 ? 'No goats' : ready === 1 ? '1 goat' : `${ready} goats`} ready to sell
      </Text>
      <Text style={st.glanceMeta}>
        of {goats.length} in the herd · sale weight {saleKg} kg
      </Text>
      <View style={st.stack}>
        {present.map((k) => (
          <View key={k} style={{ flex: counts[k], backgroundColor: tone[k].bg, opacity: tone[k].o }} />
        ))}
      </View>
      <View style={st.legend}>
        {present.map((k) => (
          <View key={k} style={st.legendItem}>
            <View style={[st.dot, { backgroundColor: tone[k].bg, opacity: tone[k].o }]} />
            <Text style={st.legendText}>
              <Text style={{ fontWeight: '700' }}>{counts[k]}</Text> {LABEL[k]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GoatTile({ goat }: { goat: Goat }) {
  const { C, T } = useTheme();
  const st = useSt();
  const w = latest(goat);
  const status = saleStatus(goat);
  const isReady = status.kind === 'ready';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goat.name}, tag ${goat.tag}, ${w ? `${kg(w.weight)} kilograms` : ''}, ${status.spoken}`}
      onPress={() => router.push({ pathname: '/goat/[id]', params: { id: goat.id } })}
      style={({ pressed }) => [st.tile, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
      <View style={st.tileBody}>
        <EarTag tag={goat.tag} ready={isReady} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[T.heading, { fontSize: 17 }]} numberOfLines={1}>
            {goat.name}
          </Text>
          <Text style={T.meta} numberOfLines={1}>
            {stageLabel(goat.stage)} · {goat.member}
          </Text>
          <Text style={[st.status, { color: isReady ? C.ochre : status.kind === 'soon' ? C.green : C.ink2 }]} numberOfLines={1}>
            {status.label}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={st.kg}>{w ? kg(w.weight) : '—'}</Text>
          <Text style={st.kgUnit}>kg</Text>
        </View>
      </View>
      <Tape kg={w ? w.weight : null} edge />
    </Pressable>
  );
}

function LastWeighing({ goat }: { goat: Goat }) {
  const { T } = useTheme();
  const st = useSt();
  const w = latest(goat)!;
  const cells: [string, string][] = [
    ['Goat', `${goat.name} · ${goat.tag}`],
    ['Estimated Weight', `${kg(w.weight)} kg`],
    ['Growth stage', stageLabel(w.stage)],
    ['Heart Girth', `${cm(w.heartGirth)} cm`],
  ];
  return (
    <Section title="Last weighing" aside={`${ago(w.at)} · ${goat.member}`} style={st.block} bare>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Last weighing: ${goat.name}, ${kg(w.weight)} kilograms, ${ago(w.at)}`}
        onPress={() => router.push({ pathname: '/goat/[id]', params: { id: goat.id } })}
        style={({ pressed }) => [st.grid, pressed && { opacity: 0.85 }]}>
        {cells.map(([label, value]) => (
          <View key={label} style={st.cell}>
            <Text style={T.label}>{label}</Text>
            <Text style={[T.heading, { fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </Pressable>
    </Section>
  );
}

const useSt = makeStyles((C) =>
  StyleSheet.create({
    block: { marginTop: S.xxl },
    glance: { backgroundColor: C.hero, borderRadius: R.lg, padding: S.xl, gap: 2 },
    glanceTitle: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6, color: C.onHero },
    glanceMeta: { fontSize: 14, lineHeight: 20, color: C.onHero, opacity: 0.75 },
    stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3, marginTop: S.lg },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: S.lg, rowGap: S.xs, marginTop: S.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 13, color: C.onHero, fontVariant: ['tabular-nums'] },
    tile: {
      backgroundColor: C.surface,
      borderRadius: R.md,
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
    },
    tileBody: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, paddingRight: S.lg },
    status: { fontSize: 13, fontWeight: '700' },
    kg: { fontSize: 30, lineHeight: 32, fontWeight: '700', letterSpacing: -0.8, color: C.ink, fontVariant: ['tabular-nums'] },
    kgUnit: { fontSize: 12, fontWeight: '600', color: C.ink2, marginTop: -2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    cell: { flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderRadius: R.sm + 2, padding: S.lg, gap: 2 },
  }),
);
