import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Tape } from '@/components/tape';
import { Button, I, Icon, Panel, Section } from '@/components/ui';
import { ago, cm, kg, shortDate, stageLabel, time } from '@/lib/format';
import { daysToSale, deleteGoat, latest, useHerd, type Weighing, useSaleWeight } from '@/lib/herd';
import { makeStyles, R, S, useTheme } from '@/theme';

export default function GoatRecord() {
  const saleKg = useSaleWeight();
  const { C, T } = useTheme();
  const st = useSt();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goats } = useHerd();
  const goat = goats.find((g) => g.id === id);

  if (!goat) {
    return (
      <View style={st.body}>
        <Text style={T.heading}>Goat not found</Text>
        <Text style={T.meta}>It may have been removed from this phone.</Text>
      </View>
    );
  }

  const w = latest(goat);
  const d = daysToSale(goat);

  const remove = () => {
    const msg = `${goat.name} and all ${goat.weighings.length} weighings will be removed from this phone.`;
    const go = () => {
      router.back();
      deleteGoat(goat.id);
    };
    if (Platform.OS === 'web') {
      if (confirm(msg)) go();
      return;
    }
    Alert.alert(`Remove ${goat.name}?`, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      <Stack.Screen
        options={{
          title: goat.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${goat.name}`}
              onPress={() => router.push({ pathname: '/goat/new', params: { id: goat.id } })}
              hitSlop={8}
              style={st.edit}>
              <Text style={[T.body, { color: C.green, fontWeight: '600' }]}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={st.body}>
        <Text style={T.meta}>
          {goat.tag} · {stageLabel(goat.stage)} · {goat.member}
          {goat.demo ? ' · demo data' : ''}
        </Text>

        {w ? (
          <>
            <Panel style={st.hero}>
            <View accessible accessibilityLabel={`Latest Estimated Weight ${kg(w.weight)} kilograms, ${ago(w.at)}`}>
              <Text style={T.label}>Latest Estimated Weight</Text>
              <Text style={T.display}>
                {kg(w.weight)}
                <Text style={st.unit}> kg</Text>
              </Text>
            </View>
            <Text style={[T.meta, { marginTop: S.xs }]}>
              Weighed {ago(w.at)} ·{' '}
              {d === 0 ? (
                <Text style={{ color: C.ochre, fontWeight: '700' }}>At sale weight</Text>
              ) : d === null ? (
                'weigh again to project sale date'
              ) : (
                `about ${d} days to ${saleKg} kg`
              )}
            </Text>
            <View style={{ marginTop: S.lg }}>
              <Tape kg={w.weight} />
            </View>
            </Panel>

            <Section title="Growth" aside={`${goat.weighings.length} weighings`} style={{ marginTop: S.xxl }}>
              <GrowthChart weighings={goat.weighings} />
            </Section>

            <Section title="Weighings" aside="Tap to open" style={{ marginTop: S.xxl }} bare>
              <View style={{ gap: S.sm }}>
                {[...goat.weighings].reverse().map((x) => (
                  <WeighingRow key={x.id} goatId={goat.id} w={x} />
                ))}
              </View>
            </Section>
          </>
        ) : (
          <View style={{ marginTop: S.xl, gap: S.sm }}>
            <Text style={T.heading}>Not weighed yet</Text>
            <Text style={T.meta}>Take a side and a top photo to get the first Estimated Weight. No scale needed.</Text>
          </View>
        )}

        <Button label={`Remove ${goat.name}`} variant="danger" onPress={remove} style={{ alignSelf: 'flex-start', marginTop: S.xxl, marginLeft: -S.md }} />
      </ScrollView>
      <View style={st.footer}>
        <Button label={`Weigh ${goat.name}`} icon={I.camera} onPress={() => router.push({ pathname: '/weigh', params: { goatId: goat.id } })} />
      </View>
    </SafeAreaView>
  );
}

/** One saved weighing: photo thumbnail, date, weight and girth; opens the full result plate. */
function WeighingRow({ goatId, w }: { goatId: string; w: Weighing }) {
  const { C, T } = useTheme();
  const st = useSt();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Weighing on ${shortDate(w.at)}, ${kg(w.weight)} kilograms. Open`}
      onPress={() => router.push({ pathname: '/result', params: { goatId, weighingId: w.id } })}
      style={({ pressed }) => [st.wRow, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
      <View style={st.thumb}>
        {w.sideUri ? (
          <Image source={{ uri: w.sideUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name={I.camera} size={20} color={C.ink2} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[T.body, { fontWeight: '600' }]}>
          {shortDate(w.at)}
          <Text style={T.meta}> · {time(w.at)}</Text>
        </Text>
        <Text style={T.meta} numberOfLines={1}>
          Girth {cm(w.heartGirth)} · Length {cm(w.bodyLength)} cm{w.synced ? '' : ' · not synced'}
        </Text>
      </View>
      <Text style={st.wKg}>
        {kg(w.weight)}
        <Text style={T.meta}> kg</Text>
      </Text>
      <Icon name={I.chevron} size={18} color={C.ink2} />
    </Pressable>
  );
}

const CHART_H = 160;

/** Weight per weighing as columns against the sale-weight line; the latest column in green. */
function GrowthChart({ weighings }: { weighings: Weighing[] }) {
  const saleKg = useSaleWeight();
  const { C, T } = useTheme();
  const st = useSt();
  const shown = weighings.slice(-8);
  const max = Math.max(saleKg * 1.15, ...shown.map((x) => x.weight));
  const saleY = (saleKg / max) * CHART_H;
  return (
    <View
      style={{ marginTop: S.md }}
      accessible
      accessibilityLabel={`Weights over time: ${shown.map((x) => `${shortDate(x.at)} ${kg(x.weight)} kilograms`).join(', ')}`}>
      <View style={st.legend}>
        <View style={st.legendKey} />
        <Text style={st.saleText}>Sale weight {saleKg} kg</Text>
      </View>
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, marginTop: S.lg }}>
        <View style={[st.saleLine, { bottom: saleY }]} />
        {shown.map((x, i) => {
          const last = i === shown.length - 1;
          return (
            <View key={x.id} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[st.colVal, last && { color: C.green }]}>{kg(x.weight)}</Text>
              <View style={[st.col, { height: Math.max(4, (x.weight / max) * CHART_H) }, last && { backgroundColor: C.green }]} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: S.sm, paddingTop: S.sm }}>
        {shown.map((x) => (
          <Text key={x.id} style={[T.meta, { flex: 1, textAlign: 'center', fontSize: 12 }]}>
            {shortDate(x.at)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useSt = makeStyles((C) => StyleSheet.create({
  body: { padding: S.lg, paddingBottom: S.xxl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  unit: { fontSize: 24, fontWeight: '600', letterSpacing: 0, color: C.ink2 },
  edit: { minHeight: 44, minWidth: 48, paddingHorizontal: S.sm, alignItems: 'center', justifyContent: 'center' },
  wRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    backgroundColor: C.surface,
    borderRadius: R.md,
    boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
  },
  thumb: { width: 56, height: 56, borderRadius: R.sm, overflow: 'hidden', backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  wKg: { fontSize: 18, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  hero: { marginTop: S.md, padding: S.xl, borderRadius: R.lg },
  saleLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderTopColor: C.ochre, borderStyle: 'dashed' },
  saleText: { fontSize: 12, fontWeight: '600', color: C.ochre },
  legend: { flexDirection: 'row', alignItems: 'center', gap: S.sm, alignSelf: 'flex-end' },
  legendKey: { width: 20, borderTopWidth: 1, borderTopColor: C.ochre, borderStyle: 'dashed' },
  col: { width: '70%', maxWidth: 36, backgroundColor: C.surface2, borderRadius: 8 },
  colVal: { fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 2, fontVariant: ['tabular-nums'] },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: S.lg },
}));
