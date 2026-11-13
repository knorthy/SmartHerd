import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, Segmented } from '@/components/ui';
import { STAGES, type GrowthStage } from '@/lib/estimate';
import { stageLabel } from '@/lib/format';
import { addGoat, useHerd } from '@/lib/herd';
import { C, S } from '@/theme';

export default function RegisterGoat() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { goats } = useHerd();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [member, setMember] = useState(goats[goats.length - 1]?.member ?? '');
  const [stage, setStage] = useState<GrowthStage | null>(null);
  const [tried, setTried] = useState(false);

  const t = tag.trim().toUpperCase();
  const errors = {
    name: !name.trim() ? 'Enter a name.' : undefined,
    tag: !t ? 'Enter the ear tag.' : goats.some((g) => g.tag === t) ? `Tag ${t} is already registered.` : undefined,
    member: !member.trim() ? 'Enter the member who raises this goat.' : undefined,
  };
  const valid = !errors.name && !errors.tag && !errors.member && stage;

  const save = () => {
    setTried(true);
    if (!valid) return;
    const g = addGoat({ name: name.trim(), tag: t, member: member.trim(), stage });
    if (from === 'weigh') router.dismissTo({ pathname: '/weigh', params: { goatId: g.id } });
    else router.replace({ pathname: '/goat/[id]', params: { id: g.id } });
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Bituin" error={tried ? errors.name : undefined} autoFocus />
        <Field label="Ear tag" value={tag} onChangeText={setTag} placeholder="e.g. T-014" autoCapitalize="characters" error={tried ? errors.tag : undefined} />
        <Field label="Cooperative member" value={member} onChangeText={setMember} placeholder="Who raises this goat" error={tried ? errors.member : undefined} />
        <Segmented label="Growth stage" options={STAGES.map((s) => ({ value: s, label: stageLabel(s) }))} value={stage} onChange={setStage} />
      </ScrollView>
      <View style={st.footer}>
        <Button label="Save goat" onPress={save} disabled={tried && !valid} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.rule },
});
