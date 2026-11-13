import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TabScreen } from '@/components/screen';
import { SyncStatus } from '@/components/sync-status';
import { SideDiagram } from '@/components/diagrams';
import { Tape } from '@/components/tape';
import { Button, Empty } from '@/components/ui';
import { SALE_WEIGHT_KG } from '@/lib/estimate';
import { ago, cm, kg, stageLabel } from '@/lib/format';
import { daysToSale, latest, loadDemoHerd, rankForSale, useHerd, type Goat } from '@/lib/herd';
import { C, S, T } from '@/theme';

export default function SaleBoard() {
  const { goats } = useHerd();
  const ranked = rankForSale(goats);
  const lastGoat = goats
    .filter((g) => latest(g))
    .sort((a, b) => latest(b)!.at - latest(a)!.at)[0];
  const ready = goats.filter((g) => daysToSale(g) === 0).length;

  return (
    <TabScreen
      title="Sale board"
      status={<SyncStatus />}>
      {goats.length === 0 ? (
        <>
          <View style={st.plate}>
            <SideDiagram width={300} />
            <Text style={T.caption}>Fig. 1 — What SmartHerd measures from a side photo</Text>
          </View>
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
        </>
      ) : (
        <>
          <Text style={[T.heading, { marginBottom: S.xs }]}>
            {ready > 0 ? <Text style={{ color: C.ochre }}>{ready} of {goats.length} goats</Text> : `None of ${goats.length} goats`} at sale weight
          </Text>
          <Text style={[T.meta, { marginBottom: S.lg }]}>
            Ranked by days to {SALE_WEIGHT_KG} kg{goats.some((g) => g.demo) ? ' · demo data' : ''}
          </Text>

          <View accessibilityRole="list">
            <View style={[st.row, st.headRow]}>
              <Text style={[T.label, st.cTag]}>Tag</Text>
              <Text style={[T.label, st.cName]}>Goat</Text>
              <Text style={[T.label, st.cKg]}>kg</Text>
              <Text style={[T.label, st.cStatus]}>Status</Text>
            </View>
            {ranked.map((g) => (
              <BoardRow key={g.id} goat={g} />
            ))}
          </View>

          {lastGoat && <LastSlip goat={lastGoat} />}
        </>
      )}
    </TabScreen>
  );
}

function BoardRow({ goat }: { goat: Goat }) {
  const w = latest(goat);
  const d = daysToSale(goat);
  const isReady = d === 0;
  const status = !w ? 'Not weighed' : isReady ? 'Ready' : d === null ? '—' : `${d} d`;
  const spoken = !w ? 'not weighed yet' : isReady ? 'at sale weight' : d === null ? 'not enough history to project' : `about ${d} days to sale weight`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goat.name}, tag ${goat.tag}, ${w ? `${kg(w.weight)} kilograms` : ''}, ${spoken}`}
      onPress={() => router.push({ pathname: '/goat/[id]', params: { id: goat.id } })}
      style={({ pressed }) => [st.row, isReady && { backgroundColor: C.ochreTint }, pressed && { backgroundColor: C.greenTint }]}>
      <Text style={[T.bodyNum, st.cTag, { color: C.ink2 }]}>{goat.tag}</Text>
      <View style={st.cName}>
        <Text style={[T.body, { fontWeight: '600' }]} numberOfLines={1}>
          {goat.name}
        </Text>
        <Tape kg={w ? w.weight : null} compact />
      </View>
      <Text style={[T.bodyNum, st.cKg]}>{w ? kg(w.weight) : '—'}</Text>
      <Text style={[T.bodyNum, st.cStatus, isReady && { color: C.ochre, fontWeight: '700' }, !w && { color: C.ink2 }]}>{status}</Text>
    </Pressable>
  );
}

function LastSlip({ goat }: { goat: Goat }) {
  const w = latest(goat)!;
  const cells: [string, string][] = [
    ['Last weighing', `${goat.name} · ${goat.tag}`],
    ['Estimated Weight', `${kg(w.weight)} kg`],
    ['Growth stage', stageLabel(w.stage)],
    ['Heart Girth', `${cm(w.heartGirth)} cm`],
  ];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Last weighing: ${goat.name}, ${kg(w.weight)} kilograms, ${ago(w.at)}`}
      onPress={() => router.push({ pathname: '/goat/[id]', params: { id: goat.id } })}
      style={({ pressed }) => [st.slip, pressed && { backgroundColor: C.greenTint }]}>
      <View style={st.slipGrid}>
        {cells.map(([label, value], i) => (
          <View key={label} style={[st.cell, i % 2 === 0 && st.cellRight, i < 2 && st.cellBottom]}>
            <Text style={T.label}>{label}</Text>
            <Text style={[T.heading, { fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[T.meta, st.slipFoot]}>Weighed {ago(w.at)} · {goat.member}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.rule,
  },
  headRow: { minHeight: 36, borderBottomWidth: 1, borderBottomColor: C.ink },
  cTag: { width: 64 },
  cName: { flex: 1, paddingRight: S.lg },
  cKg: { width: 56, textAlign: 'right' },
  cStatus: { width: 96, textAlign: 'right' },
  plate: { alignItems: 'center', gap: S.sm, paddingVertical: S.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  slip: { marginTop: S.xxl, borderWidth: 1, borderColor: C.ink, borderRadius: 8 },
  slipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', padding: S.md, gap: 2 },
  cellRight: { borderRightWidth: 1, borderRightColor: C.rule, borderStyle: 'dashed' },
  cellBottom: { borderBottomWidth: 1, borderBottomColor: C.rule, borderStyle: 'dashed' },
  slipFoot: { paddingHorizontal: S.md, paddingVertical: S.sm, borderTopWidth: 1, borderTopColor: C.ink },
});
