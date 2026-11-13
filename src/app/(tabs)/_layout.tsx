import { Tabs } from 'expo-router/js-tabs';

import { GlassTabBar } from '@/components/glass-tab-bar';
import { C } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.paper } }}>
      <Tabs.Screen name="index" options={{ title: 'Sale board', tabBarLabel: 'Board' }} />
      <Tabs.Screen name="goats" options={{ title: 'Goats' }} />
      <Tabs.Screen name="coop" options={{ title: 'Co-op' }} />
    </Tabs>
  );
}
