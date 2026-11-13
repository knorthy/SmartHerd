import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SideDiagram } from '@/components/diagrams';
import { TabScreen } from '@/components/screen';
import { SyncStatus } from '@/components/sync-status';
import { Tape } from '@/components/tape';
import { TourTarget } from '@/components/tour-target';
import { Button, Empty, Panel, Section } from '@/components/ui';
import { SALE_WEIGHT_KG } from '@/lib/estimate';
import { ago, cm, kg, stageLabel } from '@/lib/format';
import { daysToSale, latest, loadDemoHerd, rankForSale, useHerd, type Goat } from '@/lib/herd';
import { makeStyles, R, S, useTheme } from '@/theme';

export default function SaleBoard() {
  const { T } = useTheme();
  const st = useSt();
  const { goats } = useHerd();
  const ranked = rankForSale(goats);
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
            <TourTarget id="board-main">
              <View accessibilityRole="list" style={{ gap: S.sm }}>
                {ranked.map((g) => (
                  <GoatTile key={g.id} goat={g} />
                ))}
              </View>
            </TourTarget>
          </Section>

          {lastGoat && <LastWeighing goat={lastGoat} />}
        </>
      )}
    </TabScreen>
  );
}

/** The herd in one band: a column per goat against the sale line, ready goats in ochre. */
function HerdGlance({ goats }: { goats: Goat[] }) {
  const { C } = useTheme();
  const st = useSt();
  const ranked = rankForSale(goats);
  const ready = goats.filter((g) => daysToSale(g) === 0).length;
  const soon = goats.filter((g) => {
    const d = daysToSale(g);
    return d !== null && d > 0 && d <= 30;
  }).length;
  const max = Math.max(SALE_WEIGHT_KG * 1.35, ...goats.map((g) => latest(g)?.weight ?? 0));
  const H = 64;
  return (
    <View style={st.glance} accessible accessibilityLabel={`${ready} of ${goats.length} goats at sale weight, ${soon} more within 30 days`}>
      <Text style={st.glanceTitle}>
        {ready === 0 ? 'No goats' : ready === 1 ? '1 goat' : `${ready} goats`} ready to sell
      </Text>
      <Text style={st.glanceMeta}>
        {soon > 0 ? `${soon} more within 30 days · ` : ''}sale weight {SALE_WEIGHT_KG} kg
      </Text>
      <View style={[st.bars, { height: H }]}>
        <View style={[st.saleLine, { bottom: (SALE_WEIGHT_KG / max) * H }]} />
        {ranked.map((g) => {
          const w = latest(g)?.weight ?? 0;
          const isReady = w >= SALE_WEIGHT_KG;
          return (
            <View
              key={g.id}
              style={[st.bar, { height: Math.max(4, (w / max) * H), backgroundColor: isReady ? C.ochre : C.onHero, opacity: isReady ? 1 : 0.35 }]}
            />
          );
        })}
      </View>
    </View>
  );
}

function GoatTile({ goat }: { goat: Goat }) {
  const { C, T } = useTheme();
  const st = useSt();
  const w = latest(goat);
  const d = daysToSale(goat);
  const isReady = d === 0;
  const status = !w ? 'Not weighed' : isReady ? 'Ready' : d === null ? 'Weigh again' : `${d} days`;
  const spoken = !w ? 'not weighed yet' : isReady ? 'at sale weight' : d === null ? 'not enough history to project' : `about ${d} days to sale weight`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goat.name}, tag ${goat.tag}, ${w ? `${kg(w.weight)} kilograms` : ''}, ${spoken}`}
      onPress={() => router.push({ pathname: '/goat/[id]', params: { id: goat.id } })}
      style={({ pressed }) => [st.tile, isReady && { backgroundColor: C.ochreTint }, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
      <View style={st.tileTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[T.heading, { fontSize: 17 }]} numberOfLines={1}>
            {goat.name}
          </Text>
          <Text style={T.meta} numberOfLines={1}>
            {goat.tag} · {stageLabel(goat.stage)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={st.kg}>
            {w ? kg(w.weight) : '—'}
            <Text style={[T.meta, { fontWeight: '500' }]}> kg</Text>
          </Text>
          <View style={[st.chip, { backgroundColor: isReady ? C.ochre : C.surface2 }]}>
            <Text style={[st.chipText, { color: isReady ? C.surface : C.ink2 }]}>{status}</Text>
          </View>
        </View>
      </View>
      <Tape kg={w ? w.weight : null} compact />
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
    glance: {
      backgroundColor: C.hero,
      borderRadius: R.lg,
      padding: S.xl,
      paddingBottom: S.lg,
      gap: 2,
      overflow: 'hidden',
    },
    glanceTitle: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6, color: C.onHero },
    glanceMeta: { fontSize: 14, lineHeight: 20, color: C.onHero, opacity: 0.75 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: S.lg },
    bar: { flex: 1, maxWidth: 28, borderRadius: 6 },
    saleLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: C.ochre, opacity: 0.9 },
    tile: {
      backgroundColor: C.surface,
      borderRadius: R.md,
      padding: S.lg,
      gap: S.sm,
      boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
    },
    tileTop: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    kg: { fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4, color: C.ink, fontVariant: ['tabular-nums'] },
    chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    chipText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    cell: { flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderRadius: R.sm + 2, padding: S.lg, gap: 2 },
  }),
);
