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
import { makeStyles, R, S, useTheme } from '@/theme';

const DEFAULT_DISTANCE = '150';
const DEFAULT_TOP_DISTANCE = '100';

const distanceError = (v: string) => (v && !(Number(v) >= 50 && Number(v) <= 400) ? 'Enter a distance between 50 and 400 cm.' : undefined);

/** 35 mm-equivalent focal length from the picker's EXIF (Android FocalLengthIn35mmFilm, iOS FocalLenIn35mmFilm); web gives none. */
function focal35(a: ImagePicker.ImagePickerAsset) {
  const v = Number(a.exif?.FocalLengthIn35mmFilm ?? a.exif?.FocalLenIn35mmFilm);
  return v > 0 ? String(v) : '';
}

export default function NewWeighing() {
  const { C, T } = useTheme();
  const st = useSt();
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
  const [sideF35, setSideF35] = useState('');
  const [topF35, setTopF35] = useState('');
  const [distance, setDistance] = useState(DEFAULT_DISTANCE);
  const [topDistance, setTopDistance] = useState(DEFAULT_TOP_DISTANCE);

  const distError = distanceError(distance);
  const topDistError = distanceError(topDistance);
  const ready = goat && stage && side && top && distance && topDistance && !distError && !topDistError;

  const chooseGoat = (id: string) => {
    setPicked(id);
    setStage(null);
  };

  const estimate = () => {
    if (!ready) return;
    router.push({ pathname: '/result', params: { goatId: goat.id, stage, side, top, distance: String(Number(distance)), topDistance: String(Number(topDistance)), sideF35, topF35 } });
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Step n="1" title="Goat">
          {goats.length === 0 ? (
            <Button label="Register a goat first" variant="tonal" onPress={() => router.push({ pathname: '/goat/new', params: { from: 'weigh' } })} />
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
            <PhotoSlot label="Side view" hint="Stand level with the goat's flank, whole body in frame." uri={side} onPick={(u, f) => { setSide(u); setSideF35(f); }} />
            <PhotoSlot label="Top view" hint="Hold the phone above the back, head to tail in frame." uri={top} onPick={(u, f) => { setTop(u); setTopF35(f); }} />
          </View>
        </Step>

        <Step n="4" title="Camera distance">
          <View style={{ gap: S.lg }}>
            <Field
              label="Side-view distance (cm)"
              hint="On the device this comes from the distance sensor. Here it is entered."
              keyboardType="number-pad"
              value={distance}
              onChangeText={(t) => setDistance(t.replace(/[^0-9]/g, ''))}
              error={distError}
              maxLength={3}
            />
            <Field
              label="Top-view distance (cm)"
              hint="From the phone to the goat's back."
              keyboardType="number-pad"
              value={topDistance}
              onChangeText={(t) => setTopDistance(t.replace(/[^0-9]/g, ''))}
              error={topDistError}
              maxLength={3}
            />
          </View>
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
  const { C, T } = useTheme();
  const st = useSt();
  return (
    <View style={st.step}>
      <View style={st.stepHead}>
        <View style={st.badge}>
          <Text style={[st.badgeText, { color: C.onGreen }]}>{n}</Text>
        </View>
        <Text style={T.heading}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PhotoSlot({ label, hint, uri, onPick }: { label: string; hint: string; uri?: string; onPick: (uri: string, f35: string) => void }) {
  const { C, T } = useTheme();
  const st = useSt();
  const [camPerm, requestCam] = ImagePicker.useCameraPermissions();

  const take = async () => {
    if (Platform.OS !== 'web' && !camPerm?.granted) {
      const res = await requestCam();
      if (!res.granted) {
        Alert.alert('Camera not allowed', 'Allow camera access in Settings, or choose a photo from the gallery.');
        return;
      }
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, exif: true });
    if (!r.canceled) onPick(r.assets[0].uri, focal35(r.assets[0]));
  };
  const choose = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, exif: true });
    if (!r.canceled) onPick(r.assets[0].uri, focal35(r.assets[0]));
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
        <Button label={uri ? 'Retake' : 'Take photo'} variant="tonal" icon={I.camera} onPress={take} style={{ flex: 1, paddingHorizontal: S.md }} />
        <Button label="Gallery" variant="text" icon={I.library} onPress={choose} />
      </View>
    </View>
  );
}

const useSt = makeStyles((C) => StyleSheet.create({
  body: { padding: S.lg, gap: S.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
  step: {
    gap: S.lg,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.lg,
    boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
  },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: { minHeight: 48, paddingHorizontal: S.lg, borderRadius: 24, backgroundColor: C.surface2, flexDirection: 'row', alignItems: 'center', gap: S.sm },
  chipOn: { backgroundColor: C.greenTint, boxShadow: `inset 0 0 0 1.5px ${C.green}` },
  thumb: { width: 88, height: 66, borderRadius: R.sm, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: S.lg, gap: S.sm },
}));
