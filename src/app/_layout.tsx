import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/loading-screen';
import { useHerd } from '@/lib/herd';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { onboarded = false } = useHerd();
  const [loading, setLoading] = useState(true);
  const done = useCallback(() => setLoading(false), []);

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
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="weigh" options={{ title: 'New weighing' }} />
          <Stack.Screen name="result" options={{ title: 'Weight estimation complete', headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="goat/new" options={{ title: 'Register goat', presentation: 'modal' }} />
          <Stack.Screen name="goat/[id]" options={{ title: 'Goat record' }} />
        </Stack.Protected>
      </Stack>
      {loading && <LoadingScreen onDone={done} />}
    </GestureHandlerRootView>
  );
}
