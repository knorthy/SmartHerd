import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { C } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.paper }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.paper },
          headerTintColor: C.ink,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.paper },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="weigh" options={{ title: 'New weighing' }} />
        <Stack.Screen name="result" options={{ title: 'Weight estimation complete', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="goat/new" options={{ title: 'Register goat', presentation: 'modal' }} />
        <Stack.Screen name="goat/[id]" options={{ title: 'Goat record' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
