import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, S, T } from '@/theme';

/** Tab screen: large title, optional right-side status, scrolling body, optional pinned footer action. */
export function TabScreen({ title, status, footer, children }: { title: string; status?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={st.root}>
      <ScrollView contentContainerStyle={st.body}>
        <View style={st.head}>
          <Text style={T.title} accessibilityRole="header">
            {title}
          </Text>
          {status}
        </View>
        {children}
      </ScrollView>
      {footer ? <View style={st.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  body: { paddingHorizontal: S.lg, paddingBottom: S.xxl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: S.lg, paddingBottom: S.xl, gap: S.md },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: S.lg, paddingVertical: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.rule, backgroundColor: C.paper },
});
