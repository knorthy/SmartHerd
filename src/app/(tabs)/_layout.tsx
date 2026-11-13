import { Tabs } from 'expo-router/js-tabs';

import { I, Icon } from '@/components/ui';
import { C } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.ink2,
        tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.rule },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: C.paper },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Sale board', tabBarLabel: 'Board', tabBarIcon: ({ color }) => <Icon name={I.board} color={color} /> }} />
      <Tabs.Screen name="goats" options={{ title: 'Goats', tabBarIcon: ({ color }) => <Icon name={I.goats} color={color} /> }} />
      <Tabs.Screen name="coop" options={{ title: 'Co-op', tabBarIcon: ({ color }) => <Icon name={I.coop} color={color} /> }} />
    </Tabs>
  );
}
