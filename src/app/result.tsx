import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Figure } from '@/components/figure';
import { Tape } from '@/components/tape';
import { Button, DataRow, Panel, Section } from '@/components/ui';
import { simulateEstimate, STAGES, type GrowthStage } from '@/lib/estimate';
import { cm, kg, shortDate, stageLabel, time } from '@/lib/format';
import { addWeighing, latest, removeWeighing, restoreWeighing, useHerd, useSaleWeight } from '@/lib/herd';
import { deletePhotos } from '@/lib/photos';
import { showToast } from '@/lib/toast';
import { makeStyles, R, S, useTheme } from '@/theme';

type Params = { goatId: string; stage?: string; side?: string; top?: string; distance?: string; weighingId?: string };

/** A fresh estimate to save, or (with `weighingId`) a saved weighing reopened from the goat record. */
export default function Result() {
  const saleKg = useSaleWeight();
  const { C, T } = useTheme();
  const st = useSt();
  const p = useLocalSearchParams<Params>();
  const [fresh] = useState(() =>
    simulateEstimate(STAGES.includes(p.stage as GrowthStage) ? (p.stage as GrowthStage) : 'adult'),
  );
  const [saving, setSaving] = useState(false);
  const { goats } = useHerd();
  const goat = goats.find((g) => g.id === p.goatId);
  const savedIndex = p.weighingId && goat ? goat.weighings.findIndex((w) => w.id === p.weighingId) : -1;
  const saved = savedIndex >= 0 ? goat!.weighings[savedIndex] : undefined;
  const viewing = !!p.weighingId;

  if (!goat || (viewing && !saved)) {
    return (
      <View style={[st.body, { flex: 1 }]}>
        <Text style={T.heading}>{goat ? 'This weighing was deleted.' : 'This goat is no longer registered.'}</Text>
        <Button label="Back" variant="tonal" onPress={() => (router.canGoBack() ? router.back() : leave())} style={{ marginTop: S.lg }} />
      </View>
    );
  }

  const est = saved ?? fresh;
  const stage: GrowthStage = saved?.stage ?? (STAGES.includes(p.stage as GrowthStage) ? (p.stage as GrowthStage) : 'adult');
  const side = saved ? saved.sideUri : p.side;
  const top = saved ? saved.topUri : p.top;
  const distance = saved ? saved.distanceCm : Number(p.distance) || 0;
  const prev = saved ? goat.weighings[savedIndex - 1] : latest(goat);

  const save = async () => {
    setSaving(true);
    await addWeighing(goat.id, { ...fresh, stage, distanceCm: distance, sideUri: p.side, topUri: p.top });
    leave();
    router.push({ pathname: '/goat/[id]', params: { id: goat.id } });
    showToast({ message: `Saved to ${goat.name}’s record` });
  };

  const home = () => {
    const msg = 'This estimate has not been saved to the goat record.';
    if (Platform.OS === 'web') {
      if (confirm(`${msg} Leave anyway?`)) leave();
      return;
    }
    Alert.alert('Leave without saving?', msg, [
      { text: 'Stay', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => leave() },
    ]);
  };

  const remove = () => {
    const undo = removeWeighing(goat.id, saved!.id);
    router.back();
    if (!undo) return;
    showToast({
      message: `Weighing from ${shortDate(undo.weighing.at)} deleted`,
      action: { label: 'Undo', onPress: () => restoreWeighing(undo) },
      onExpire: () => deletePhotos([undo.weighing.sideUri, undo.weighing.topUri]),
    });
  };

  const diff = prev ? est.weight - prev.weight : null;
  const toSale = saleKg - est.weight;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      {saved && <Stack.Screen options={{ title: `Weighing · ${shortDate(saved.at)}`, headerBackVisible: true, gestureEnabled: true }} />}
      <ScrollView contentContainerStyle={st.body}>
        <Text style={T.meta}>
          {goat.name} · {goat.tag} · {stageLabel(stage)}
        </Text>

        <Panel style={st.hero}>
        <View accessible accessibilityLabel={`Estimated Weight ${kg(est.weight)} kilograms`}>
          <Text style={T.label}>Estimated Weight{saved ? ` · ${time(saved.at)}` : ''}</Text>
          <Text style={T.display}>
            {saved ? kg(est.weight) : <CountUp to={est.weight} />}
            <Text style={st.unit}> kg</Text>
          </Text>
        </View>
        <View style={{ marginTop: S.lg }}>
          <Tape kg={est.weight} animate={!saved} />
        </View>
        <Text style={[T.meta, { marginTop: S.xs }]}>
          {toSale <= 0 ? (
            <Text style={{ color: C.ochre, fontWeight: '700' }}>At sale weight</Text>
          ) : (
            `${kg(toSale)} kg below the ${saleKg} kg sale weight`
          )}
          {diff !== null && prev ? ` · ${diff >= 0 ? '+' : '−'}${kg(Math.abs(diff))} kg since ${shortDate(prev.at)}` : ''}
        </Text>
        </Panel>

        <View style={st.figures}>
          <Figure
            uri={side}
            caption="Fig. 1 — Side view"
            horizontal={{ label: 'Body Length', value: `${cm(est.bodyLength)} cm` }}
            vertical={{ label: 'Chest Height', value: `${cm(est.chestHeight)} cm` }}
          />
          <Figure uri={top} caption="Fig. 2 — Top view" horizontal={{ label: 'Chest Width', value: `${cm(est.chestWidth)} cm` }} />
        </View>

        <Section title="Measurements" aside="cm">
          <DataRow label="Body Length" value={cm(est.bodyLength)} />
          <DataRow label="Chest Height" value={cm(est.chestHeight)} />
          <DataRow label="Chest Width" value={cm(est.chestWidth)} />
          <DataRow label="Heart Girth" value={cm(est.heartGirth)} />
        </Section>
        <Text style={[T.caption, { marginTop: S.md }]}>
          Simulated estimate. Heart girth from chest height and width (Ramanujan’s ellipse approximation); weight by Schaeffer’s formula, girth² × length ÷ 10,840. Camera distance {distance} cm.
        </Text>
      </ScrollView>
      <View style={st.footer}>
        {saved ? (
          <>
            <Button label="Delete" variant="danger" onPress={remove} style={{ flex: 1 }} />
            <Button label="Done" variant="tonal" onPress={() => router.back()} style={{ flex: 2 }} />
          </>
        ) : (
          <>
            <Button label="Home" variant="tonal" onPress={home} style={{ flex: 1 }} disabled={saving} />
            <Button label={saving ? 'Saving…' : 'Save Goat'} onPress={save} style={{ flex: 2 }} disabled={saving} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const useSt = makeStyles((C) => StyleSheet.create({
  body: { padding: S.lg, paddingBottom: S.xxl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  unit: { fontSize: 24, fontWeight: '600', letterSpacing: 0, color: C.ink2 },
  hero: { marginTop: S.md, padding: S.xl, paddingVertical: S.xl, borderRadius: R.lg },
  figures: { gap: S.xl, marginTop: S.xl, marginBottom: S.xxl },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', gap: S.md, padding: S.lg },
}));

/** Back to the tabs; on web a deep-linked result has nothing beneath it to dismiss. */
function leave() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

/** The headline figure counts up once as the tape fills, so the number and the scale land together. */
function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      setV(to * (1 - Math.pow(2, -10 * k)));
      if (k < 1) raf = requestAnimationFrame(step);
      else setV(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, reduce]);
  return <>{kg(v)}</>;
}
