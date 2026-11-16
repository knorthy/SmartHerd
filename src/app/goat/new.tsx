import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, Segmented } from '@/components/ui';
import { STAGES, type GrowthStage } from '@/lib/estimate';
import { stageLabel } from '@/lib/format';
import { addGoat, tagTaken, updateGoat, useHerd } from '@/lib/herd';
import { showToast } from '@/lib/toast';
import { makeStyles, S, useTheme } from '@/theme';

/** Registers a goat, or with `id` edits one. Tags stay unique across the herd either way. */
export default function GoatForm() {
  const { C, T } = useTheme();
  const st = useSt();
  const { from, id } = useLocalSearchParams<{ from?: string; id?: string }>();
  const { goats, profile } = useHerd();
  const editing = id ? goats.find((g) => g.id === id) : undefined;
  const [name, setName] = useState(editing?.name ?? '');
  const [tag, setTag] = useState(editing?.tag ?? '');
  const [member, setMember] = useState(editing?.member ?? (profile?.name || (goats[goats.length - 1]?.member ?? '')));
  const [stage, setStage] = useState<GrowthStage | null>(editing?.stage ?? null);
  const [tried, setTried] = useState(false);

  if (id && !editing) {
    return (
      <View style={st.body}>
        <Text style={T.heading}>This goat is no longer registered.</Text>
      </View>
    );
  }

  const t = tag.trim().toUpperCase();
  const errors = {
    name: !name.trim() ? 'Enter a name.' : undefined,
    tag: !t ? 'Enter the ear tag.' : tagTaken(t, editing?.id) ? `Tag ${t} is already registered.` : undefined,
    member: !member.trim() ? 'Enter the member who raises this goat.' : undefined,
    stage: !stage ? 'Choose a growth stage.' : undefined,
  };
  const valid = !errors.name && !errors.tag && !errors.member && !errors.stage;

  const save = () => {
    setTried(true);
    if (!valid || !stage) return;
    const fields = { name: name.trim(), tag: t, member: member.trim(), stage };
    if (editing) {
      updateGoat(editing.id, fields);
      router.back();
      showToast({ message: `Saved changes to ${fields.name}` });
      return;
    }
    const g = addGoat(fields);
    if (from === 'weigh') router.dismissTo({ pathname: '/weigh', params: { goatId: g.id } });
    else router.replace({ pathname: '/goat/[id]', params: { id: g.id } });
    showToast({ message: `${g.name} registered` });
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      {editing && <Stack.Screen options={{ title: `Edit ${editing.name}` }} />}
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Bituin" error={tried ? errors.name : undefined} autoFocus={!editing} />
        <Field label="Ear tag" value={tag} onChangeText={setTag} placeholder="e.g. T-014" autoCapitalize="characters" error={tried ? errors.tag : undefined} />
        <Field label="Cooperative member" value={member} onChangeText={setMember} placeholder="Who raises this goat" error={tried ? errors.member : undefined} />
        <View style={{ gap: S.xs }}>
          <Segmented label="Growth stage" options={STAGES.map((s) => ({ value: s, label: stageLabel(s) }))} value={stage} onChange={setStage} />
          {tried && errors.stage ? <Text style={[T.meta, { color: C.error }]}>{errors.stage}</Text> : null}
          {editing ? <Text style={T.meta}>Past weighings keep the stage they were estimated with.</Text> : null}
        </View>
      </ScrollView>
      <View style={st.footer}>
        <Button label={editing ? 'Save changes' : 'Save goat'} onPress={save} disabled={tried && !valid} />
      </View>
    </SafeAreaView>
  );
}

const useSt = makeStyles(() =>
  StyleSheet.create({
    body: { padding: S.lg, gap: S.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
    footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: S.lg },
  }),
);
