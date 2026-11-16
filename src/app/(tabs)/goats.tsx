import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTabBarSpace } from '@/components/glass-tab-bar';
import { EarTag, saleStatus } from '@/components/goat-bits';
import { TabScreen } from '@/components/screen';
import { Button, Empty, I, Icon } from '@/components/ui';
import { ago, kg, stageLabel } from '@/lib/format';
import { daysToSale, latest, useHerd, type Goat } from '@/lib/herd';
import { makeStyles, R, S, useTheme } from '@/theme';

type Sort = 'tag' | 'weight' | 'sale' | 'recent';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'tag', label: 'Tag' },
  { value: 'weight', label: 'Heaviest' },
  { value: 'sale', label: 'Nearest sale' },
  { value: 'recent', label: 'Least recent' },
];

const sorters: Record<Sort, (a: Goat, b: Goat) => number> = {
  tag: (a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }),
  weight: (a, b) => (latest(b)?.weight ?? -1) - (latest(a)?.weight ?? -1),
  sale: (a, b) => (daysToSale(a) ?? 1e6) - (daysToSale(b) ?? 1e6),
  // goats that have waited longest for a weighing first: the round to do next
  recent: (a, b) => (latest(a)?.at ?? 0) - (latest(b)?.at ?? 0),
};

export default function Goats() {
  const { C, T } = useTheme();
  const st = useSt();
  const space = useTabBarSpace();
  const { goats } = useHerd();
  const [query, setQuery] = useState('');
  const [member, setMember] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('tag');
  const [focused, setFocused] = useState(false);

  const members = [...new Set(goats.map((g) => g.member))].sort();
  const q = query.trim().toLowerCase();
  const list = goats
    .filter((g) => (!member || g.member === member) && (!q || g.name.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q)))
    .sort(sorters[sort]);

  return (
    <View style={{ flex: 1 }}>
      <TabScreen title="Goats" status={<Text style={T.meta}>{goats.length} in your herd</Text>}>
        {goats.length === 0 ? (
          <Empty title="Your herd is empty" body="Register each goat once with a name and ear tag. Every weighing is then kept on its record." />
        ) : (
          <>
            <View style={[st.search, focused && { boxShadow: `inset 0 0 0 2px ${C.green}` }]}>
              <Icon name={I.search} size={20} color={C.ink2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name or tag"
                placeholderTextColor={C.ink2}
                selectionColor={C.green}
                style={st.searchInput}
                autoCorrect={false}
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel="Search goats by name or tag"
              />
              {query ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={10} style={st.clear}>
                  <Icon name={I.close} size={18} color={C.ink2} />
                </Pressable>
              ) : null}
            </View>

            {members.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
                <Chip label="All members" on={!member} onPress={() => setMember(null)} />
                {members.map((m) => (
                  <Chip key={m} label={m} on={member === m} onPress={() => setMember(member === m ? null : m)} />
                ))}
              </ScrollView>
            )}

            <View style={st.sortRow}>
              <Text style={T.label}>Sort</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.xs }}>
                {SORTS.map((s) => (
                  <Chip key={s.value} small label={s.label} on={sort === s.value} onPress={() => setSort(s.value)} />
                ))}
              </ScrollView>
            </View>

            <Text style={[T.meta, { marginBottom: S.sm }]} accessibilityLiveRegion="polite">
              {list.length === goats.length ? `${list.length} goats` : `${list.length} of ${goats.length} goats`}
            </Text>

            {list.length === 0 ? (
              <Empty title="No goats match" body="Try another name or tag, or clear the member filter." />
            ) : (
              <View accessibilityRole="list" style={{ gap: S.sm, paddingBottom: 64 }}>
                {list.map((g) => (
                  <GoatRow key={g.id} goat={g} />
                ))}
              </View>
            )}
          </>
        )}
      </TabScreen>
      {/* thumb-reach primary for this tab, floating just above the tab bar */}
      <View pointerEvents="box-none" style={[st.fabWrap, { bottom: space - S.sm }]}>
        <View pointerEvents="box-none" style={st.fabColumn}>
          <Button label="Register goat" icon={I.plus} onPress={() => router.push('/goat/new')} style={st.fab} />
        </View>
      </View>
    </View>
  );
}

function GoatRow({ goat }: { goat: Goat }) {
  const { C, T } = useTheme();
  const st = useSt();
  const w = latest(goat);
  const status = saleStatus(goat);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goat.name}, tag ${goat.tag}, ${w ? `${kg(w.weight)} kilograms` : 'not weighed'}, ${status.spoken}`}
      onPress={() => router.push({ pathname: '/goat/[id]', params: { id: goat.id } })}
      style={({ pressed }) => [st.row, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
      <EarTag tag={goat.tag} ready={status.kind === 'ready'} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[T.body, { fontWeight: '600' }]} numberOfLines={1}>
          {goat.name}
        </Text>
        <Text style={T.meta} numberOfLines={1}>
          {stageLabel(goat.stage)} · {goat.member}
        </Text>
        <Text style={[T.meta, { fontSize: 13 }]} numberOfLines={1}>
          {w ? `Weighed ${ago(w.at)}` : 'Not weighed yet'}
        </Text>
      </View>
      <Text style={[T.bodyNum, { fontWeight: '700', fontSize: 18 }]}>{w ? `${kg(w.weight)}` : ''}</Text>
      <Icon name={I.chevron} size={18} color={C.ink2} />
    </Pressable>
  );
}

function Chip({ label, on, onPress, small }: { label: string; on: boolean; onPress: () => void; small?: boolean }) {
  const { C } = useTheme();
  const st = useSt();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[st.chip, small && st.chipSmall, { backgroundColor: on ? C.greenTint : C.surface2 }, on && { boxShadow: `inset 0 0 0 1.5px ${C.green}` }]}>
      <Text style={[st.chipText, { color: on ? C.green : C.ink2 }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useSt = makeStyles((C) =>
  StyleSheet.create({
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.sm,
      minHeight: 52,
      paddingLeft: S.lg,
      paddingRight: S.xs,
      borderRadius: 26,
      backgroundColor: C.surface,
      boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
    },
    // the pill draws the focus ring; the web's default input outline is suppressed in favour of it
    searchInput: { flex: 1, fontSize: 16, color: C.ink, minHeight: 48, outlineStyle: 'none' } as object,
    clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    chips: { gap: S.sm, paddingVertical: S.md },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.md },
    chip: { minHeight: 44, paddingHorizontal: S.lg, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    chipSmall: { minHeight: 36, paddingHorizontal: S.md, borderRadius: 18 },
    chipText: { fontSize: 14, fontWeight: '600' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      padding: S.md,
      paddingRight: S.lg,
      backgroundColor: C.surface,
      borderRadius: R.md,
      boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
    },
    fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    fabColumn: { width: '100%', maxWidth: 720, paddingHorizontal: S.lg, alignItems: 'flex-end' },
    fab: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)' },
  }),
);
