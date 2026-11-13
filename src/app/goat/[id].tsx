import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, I, Section } from '@/components/ui';
import { SALE_WEIGHT_KG } from '@/lib/estimate';
import { ago, cm, kg, shortDate, stageLabel } from '@/lib/format';
import { daysToSale, deleteGoat, latest, useHerd, type Weighing } from '@/lib/herd';
import { C, S, T } from '@/theme';

export default function GoatRecord() {
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
      <Stack.Screen options={{ title: goat.name }} />
      <ScrollView contentContainerStyle={st.body}>
        <Text style={T.meta}>
          {goat.tag} · {stageLabel(goat.stage)} · {goat.member}
          {goat.demo ? ' · demo data' : ''}
        </Text>

        {w ? (
          <>
            <View style={{ marginTop: S.lg }} accessible accessibilityLabel={`Latest Estimated Weight ${kg(w.weight)} kilograms, ${ago(w.at)}`}>
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
                `about ${d} days to ${SALE_WEIGHT_KG} kg`
              )}
            </Text>

            <Section title="Growth" aside={`${goat.weighings.length} weighings`} style={{ marginTop: S.xxl }}>
              <GrowthChart weighings={goat.weighings} />
            </Section>

            <Section title="Weighings" style={{ marginTop: S.xxl }}>
              <View style={[st.tr, { borderBottomColor: C.ink2 }]}>
                <Text style={[T.label, st.cDate]}>Date</Text>
                <Text style={[T.label, st.cNum]}>kg</Text>
                <Text style={[T.label, st.cNum]}>Girth cm</Text>
                <Text style={[T.label, st.cNum]}>Length cm</Text>
              </View>
              {[...goat.weighings].reverse().map((x) => (
                <View key={x.id} style={st.tr}>
                  <Text style={[T.bodyNum, st.cDate]}>
                    {shortDate(x.at)}
                    {!x.synced ? <Text style={T.meta}> · not synced</Text> : null}
                  </Text>
                  <Text style={[T.bodyNum, st.cNum, { fontWeight: '600' }]}>{kg(x.weight)}</Text>
                  <Text style={[T.bodyNum, st.cNum]}>{cm(x.heartGirth)}</Text>
                  <Text style={[T.bodyNum, st.cNum]}>{cm(x.bodyLength)}</Text>
                </View>
              ))}
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

const CHART_H = 160;

/** Weight per weighing as columns against the sale-weight line; the latest column in green. */
function GrowthChart({ weighings }: { weighings: Weighing[] }) {
  const shown = weighings.slice(-8);
  const max = Math.max(SALE_WEIGHT_KG * 1.15, ...shown.map((x) => x.weight));
  const saleY = (SALE_WEIGHT_KG / max) * CHART_H;
  return (
    <View
      style={{ marginTop: S.md }}
      accessible
      accessibilityLabel={`Weights over time: ${shown.map((x) => `${shortDate(x.at)} ${kg(x.weight)} kilograms`).join(', ')}`}>
      <View style={st.legend}>
        <View style={st.legendKey} />
        <Text style={st.saleText}>Sale weight {SALE_WEIGHT_KG} kg</Text>
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
      <View style={{ flexDirection: 'row', gap: S.sm, borderTopWidth: 1, borderTopColor: C.ink, paddingTop: S.xs }}>
        {shown.map((x) => (
          <Text key={x.id} style={[T.meta, { flex: 1, textAlign: 'center', fontSize: 12 }]}>
            {shortDate(x.at)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  body: { padding: S.lg, paddingBottom: S.xxl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  unit: { fontSize: 24, fontWeight: '600', letterSpacing: 0, color: C.ink2 },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  cDate: { flex: 1.6 },
  cNum: { flex: 1, textAlign: 'right' },
  saleLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderTopColor: C.ochre, borderStyle: 'dashed' },
  saleText: { fontSize: 12, fontWeight: '600', color: C.ochre },
  legend: { flexDirection: 'row', alignItems: 'center', gap: S.sm, alignSelf: 'flex-end' },
  legendKey: { width: 20, borderTopWidth: 1, borderTopColor: C.ochre, borderStyle: 'dashed' },
  col: { width: '70%', maxWidth: 36, backgroundColor: C.rule },
  colVal: { fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 2, fontVariant: ['tabular-nums'] },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.rule },
});
