import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TabScreen } from '@/components/screen';
import { Button, Empty, I, Icon } from '@/components/ui';
import { ago, kg, stageLabel } from '@/lib/format';
import { latest, useHerd } from '@/lib/herd';
import { C, S, T } from '@/theme';

export default function Goats() {
  const { goats } = useHerd();
  const sorted = [...goats].sort((a, b) => a.tag.localeCompare(b.tag));

  return (
    <TabScreen
      title="Goats"
      status={<Text style={T.meta}>{goats.length} in your herd</Text>}
      footer={<Button label="Register goat" variant="outlined" icon={I.plus} onPress={() => router.push('/goat/new')} />}>
      {goats.length === 0 ? (
        <Empty title="Your herd is empty" body="Register each goat once with a name and ear tag. Every weighing is then kept on its record." />
      ) : (
        <View accessibilityRole="list" style={{ borderTopWidth: 1, borderTopColor: C.ink }}>
          {sorted.map((g) => {
            const w = latest(g);
            return (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/goat/[id]', params: { id: g.id } })}
                style={({ pressed }) => [st.row, pressed && { backgroundColor: C.greenTint }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[T.body, { fontWeight: '600' }]} numberOfLines={1}>
                    {g.name} <Text style={[T.meta, { fontVariant: ['tabular-nums'] }]}>· {g.tag}</Text>
                  </Text>
                  <Text style={T.meta} numberOfLines={1}>
                    {stageLabel(g.stage)} · {g.member} · {w ? `weighed ${ago(w.at)}` : 'not weighed yet'}
                  </Text>
                </View>
                <Text style={[T.bodyNum, { fontWeight: '600' }]}>{w ? `${kg(w.weight)} kg` : ''}</Text>
                <Icon name={I.chevron} size={18} color={C.ink2} />
              </Pressable>
            );
          })}
        </View>
      )}
    </TabScreen>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 64,
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.rule,
  },
});
