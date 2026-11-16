import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { TabScreen } from '@/components/screen';
import { Button, DataRow, Field, I, Icon, Section, Segmented } from '@/components/ui';
import { loadDemoHerd, resetHerd, setOnboarded, setProfile, setTheme, useHerd, setSaleWeight, useSaleWeight } from '@/lib/herd';
import { makeStyles, S, useTheme, type ThemePref } from '@/theme';

export default function Profile() {
  const { T } = useTheme();
  const st = useSt();
  const herd = useHerd();
  const saleKg = useSaleWeight();
  const [name, setName] = useState(herd.profile?.name ?? '');
  const [coop, setCoop] = useState(herd.profile?.coop ?? '');
  const dirty = name.trim() !== (herd.profile?.name ?? '') || coop.trim() !== (herd.profile?.coop ?? '');
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || null;

  const replayTour = () => {
    setOnboarded(false);
    router.navigate('/');
  };

  const confirmReset = () => {
    const msg = 'This removes every goat and weighing saved on this phone. Your profile and theme stay.';
    if (Platform.OS === 'web') {
      if (confirm(msg)) resetHerd();
      return;
    }
    Alert.alert('Clear all records?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: resetHerd },
    ]);
  };

  return (
    <TabScreen title="Profile">
      <View style={st.identity}>
        <View style={st.avatar}>{initials ? <Text style={st.initials}>{initials}</Text> : <LogoMark size={40} />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={T.heading} numberOfLines={1}>
            {herd.profile?.name || 'Cooperative member'}
          </Text>
          <Text style={T.meta} numberOfLines={1}>
            {herd.profile?.coop || 'Add your cooperative below'}
          </Text>
        </View>
      </View>

      <Section title="You" style={st.section}>
        <View style={{ gap: S.lg, paddingVertical: S.md }}>
          <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Ana Reyes" hint="Pre-filled as the member when you register a goat." />
          <Field label="Cooperative" value={coop} onChangeText={setCoop} placeholder="e.g. Silang Goat Raisers Cooperative" />
          <Button label="Save profile" variant="tonal" onPress={() => setProfile({ name: name.trim(), coop: coop.trim() })} disabled={!dirty} />
        </View>
      </Section>

      <Section title="Herd" style={st.section}>
        <View style={st.stepRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={T.body}>Sale weight</Text>
            <Text style={T.meta}>Goats at or above this are marked Ready.</Text>
          </View>
          <Stepper value={saleKg} onChange={setSaleWeight} />
        </View>
      </Section>

      <Section title="Appearance" style={st.section}>
        <View style={{ paddingVertical: S.md }}>
          <Segmented<ThemePref>
            label="Theme"
            value={herd.theme ?? 'system'}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light', icon: I.sun },
              { value: 'dark', label: 'Dark', icon: I.moon },
              { value: 'system', label: 'System', icon: I.auto },
            ]}
          />
          <Text style={[T.meta, { marginTop: S.sm }]}>Light reads best outdoors in bright sun. Dark is easier on the eyes in the evening.</Text>
        </View>
      </Section>

      <Section title="Help" style={st.section}>
        <View style={st.actions}>
          <Button label="Replay the tour" variant="text" icon={I.tour} onPress={replayTour} />
        </View>
      </Section>

      <Section title="Data on this phone" style={st.section}>
        <View style={st.actions}>
          {herd.goats.length === 0 ? (
            <Button label="Load demo herd" variant="text" onPress={loadDemoHerd} />
          ) : (
            <Button label="Clear all records" variant="danger" onPress={confirmReset} />
          )}
        </View>
      </Section>

      <Section title="About" style={st.section}>
        <DataRow label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
        <Text style={[T.caption, { marginTop: S.md }]}>
          SmartHerd · COSC 111A Internet of Things, Cavite State University. Weights are simulated estimates for this prototype.
        </Text>
      </Section>
    </TabScreen>
  );
}

const MIN_SALE = 15;
const MAX_SALE = 80;

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { C, T } = useTheme();
  const st = useSt();
  const step = (d: number) => onChange(Math.min(MAX_SALE, Math.max(MIN_SALE, value + d)));
  return (
    <View
      style={st.stepper}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Sale weight"
      accessibilityValue={{ min: MIN_SALE, max: MAX_SALE, now: value, text: `${value} kilograms` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <Pressable onPress={() => step(-1)} disabled={value <= MIN_SALE} style={st.stepBtn} hitSlop={4}>
        <Icon name={I.minus} size={20} color={value <= MIN_SALE ? C.rule : C.green} />
      </Pressable>
      <Text style={[T.bodyNum, st.stepValue]}>
        {value}
        <Text style={T.meta}> kg</Text>
      </Text>
      <Pressable onPress={() => step(1)} disabled={value >= MAX_SALE} style={st.stepBtn} hitSlop={4}>
        <Icon name={I.plus} size={20} color={value >= MAX_SALE ? C.rule : C.green} />
      </Pressable>
    </View>
  );
}

const useSt = makeStyles((C) =>
  StyleSheet.create({
    identity: { flexDirection: 'row', alignItems: 'center', gap: S.lg, paddingBottom: S.lg },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: C.greenTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: { fontSize: 22, fontWeight: '700', color: C.green, letterSpacing: 0.5 },
    section: { marginTop: S.xxl },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
    stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 26, padding: 2 },
    stepBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    stepValue: { minWidth: 64, textAlign: 'center', fontWeight: '700', fontSize: 17 },
    actions: { flexDirection: 'row', marginTop: S.md, marginLeft: -S.md },
  }),
);
