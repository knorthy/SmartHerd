import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, S, T } from '@/theme';

import { useTabBarSpace } from './glass-tab-bar';
import { Brand } from './logo';

/** Tab screen: brand line with status, large title with optional action, content clearing the floating bar. */
export function TabScreen({ title, status, action, children }: { title: string; status?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const bottom = useTabBarSpace();
  return (
    <SafeAreaView edges={['top']} style={st.root}>
      <ScrollView contentContainerStyle={[st.body, { paddingBottom: bottom }]}>
        <View style={st.brandRow}>
          <Brand />
          {status}
        </View>
        <View style={st.head}>
          <Text style={T.title} accessibilityRole="header">
            {title}
          </Text>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  body: { paddingHorizontal: S.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: S.md,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.rule,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: S.xl, paddingBottom: S.lg, gap: S.md },
});
