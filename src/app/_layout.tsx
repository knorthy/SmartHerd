import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/loading-screen';
import { SpotlightTour } from '@/components/spotlight-tour';
import { ToastHost } from '@/components/toast-host';
import { apiBase } from '@/lib/api';
import { markLaunched, setOnboarded, useHerd } from '@/lib/herd';
import { syncNow } from '@/lib/sync';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { C, scheme } = useTheme();
  const { onboarded = false, launched = false } = useHerd();
  const [quick] = useState(launched);
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const loaded = useCallback(() => {
    setLoading(false);
    markLaunched();
  }, []);
  const toured = useCallback(() => setOnboarded(true), []);

  // the spec's "retried automatically": sync on launch and whenever the app comes back to the foreground
  useEffect(() => {
    const sync = () => {
      if (apiBase()) void syncNow();
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.paper }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
      <ToastHost />
      {!loading && !onboarded && pathname === '/' && <SpotlightTour onDone={toured} />}
      {loading && <LoadingScreen onDone={loaded} quick={quick} />}
    </GestureHandlerRootView>
  );
}
