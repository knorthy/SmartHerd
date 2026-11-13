import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, I, Icon, Segmented } from '@/components/ui';
import { STAGES, type GrowthStage } from '@/lib/estimate';
import { stageLabel } from '@/lib/format';
import { useHerd } from '@/lib/herd';
import { C, S, T } from '@/theme';

const DEFAULT_DISTANCE = '150';

export default function NewWeighing() {
  const { goatId: preset } = useLocalSearchParams<{ goatId?: string }>();
  const { goats } = useHerd();
  // the preset param also arrives when a goat is registered from this screen
  const [picked, setPicked] = useState<string | null>(null);
  const goatId = picked ?? preset ?? null;
  const goat = goats.find((g) => g.id === goatId);
  const [stagePick, setStage] = useState<GrowthStage | null>(null);
  const stage = stagePick ?? goat?.stage ?? null;
  const [side, setSide] = useState<string>();
  const [top, setTop] = useState<string>();
  const [distance, setDistance] = useState(DEFAULT_DISTANCE);

  const dist = Number(distance);
  const distError = distance && !(dist >= 50 && dist <= 400) ? 'Enter a distance between 50 and 400 cm.' : undefined;
  const ready = goat && stage && side && top && distance && !distError;

  const chooseGoat = (id: string) => {
    setPicked(id);
    setStage(null);
  };

  const estimate = () => {
    if (!ready) return;
    router.push({ pathname: '/result', params: { goatId: goat.id, stage, side, top, distance: String(dist) } });
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Step n="1" title="Goat">
          {goats.length === 0 ? (
            <Button label="Register a goat first" variant="outlined" onPress={() => router.push({ pathname: '/goat/new', params: { from: 'weigh' } })} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
              {goats.map((g) => {
                const on = g.id === goatId;
                return (
                  <Pressable
                    key={g.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => chooseGoat(g.id)}
                    style={[st.chip, on && st.chipOn]}>
                    <Text style={[T.body, on && { color: C.green, fontWeight: '600' }]}>{g.name}</Text>
                    <Text style={[T.meta, { fontVariant: ['tabular-nums'] }]}>{g.tag}</Text>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/goat/new', params: { from: 'weigh' } })} style={st.chip}>
                <Icon name={I.plus} size={18} color={C.green} />
                <Text style={[T.body, { color: C.green }]}>New</Text>
              </Pressable>
            </ScrollView>
          )}
        </Step>

        <Step n="2" title="Growth stage">
          <Segmented label="Sets which correction model is used" options={STAGES.map((s) => ({ value: s, label: stageLabel(s) }))} value={stage} onChange={setStage} />
        </Step>

        <Step n="3" title="Photos">
          <View style={{ gap: S.lg }}>
            <PhotoSlot label="Side view" hint="Stand level with the goat's flank, whole body in frame." uri={side} onPick={setSide} />
            <PhotoSlot label="Top view" hint="Hold the phone above the back, head to tail in frame." uri={top} onPick={setTop} />
          </View>
        </Step>

        <Step n="4" title="Camera distance">
          <Field
            label="Distance to goat (cm)"
            hint="On the device this comes from the distance sensor. Here it is entered."
            keyboardType="number-pad"
            value={distance}
            onChangeText={(t) => setDistance(t.replace(/[^0-9]/g, ''))}
            error={distError}
            maxLength={3}
          />
        </Step>
      </ScrollView>
      <View style={st.footer}>
        {!ready && <Text style={[T.meta, { textAlign: 'center' }]}>{!goat ? 'Choose a goat' : !stage ? 'Choose a growth stage' : !side || !top ? 'Add both photos' : 'Check the distance'}</Text>}
        <Button label="Estimate weight" onPress={estimate} disabled={!ready} />
      </View>
    </SafeAreaView>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <View style={st.step}>
      <View style={st.stepHead}>
        <Text style={[T.label, { color: C.green, fontVariant: ['tabular-nums'] }]}>{n}</Text>
        <Text style={T.heading}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PhotoSlot({ label, hint, uri, onPick }: { label: string; hint: string; uri?: string; onPick: (uri: string) => void }) {
  const [camPerm, requestCam] = ImagePicker.useCameraPermissions();

  const take = async () => {
    if (Platform.OS !== 'web' && !camPerm?.granted) {
      const res = await requestCam();
      if (!res.granted) {
        Alert.alert('Camera not allowed', 'Allow camera access in Settings, or choose a photo from the gallery.');
        return;
      }
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) onPick(r.assets[0].uri);
  };
  const choose = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) onPick(r.assets[0].uri);
  };

  return (
    <View style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
        <View style={st.thumb}>
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`${label} photo`} /> : <Icon name={I.camera} color={C.ink2} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[T.body, { fontWeight: '600' }]}>
            {label} {uri ? <Text style={[T.meta, { color: C.green }]}>· added</Text> : null}
          </Text>
          <Text style={T.meta}>{hint}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Button label={uri ? 'Retake' : 'Take photo'} variant="outlined" icon={I.camera} onPress={take} style={{ flex: 1, paddingHorizontal: S.md }} />
        <Button label="Gallery" variant="text" icon={I.library} onPress={choose} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  body: { padding: S.lg, gap: S.xxl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  step: { gap: S.md },
  stepHead: { flexDirection: 'row', alignItems: 'baseline', gap: S.sm, borderBottomWidth: 1, borderBottomColor: C.ink, paddingBottom: S.sm },
  chip: { minHeight: 48, paddingHorizontal: S.lg, borderRadius: 24, borderWidth: 1, borderColor: C.ink2, flexDirection: 'row', alignItems: 'center', gap: S.sm },
  chipOn: { borderColor: C.green, backgroundColor: C.greenTint },
  thumb: { width: 88, height: 66, borderWidth: 1, borderColor: C.ink, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: S.lg, gap: S.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.rule },
});
