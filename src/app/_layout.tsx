import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/loading-screen';
import { SpotlightTour } from '@/components/spotlight-tour';
import { setOnboarded, useHerd } from '@/lib/herd';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { C, scheme } = useTheme();
  const { onboarded = false } = useHerd();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const loaded = useCallback(() => setLoading(false), []);
  const toured = useCallback(() => setOnboarded(true), []);

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
      {!loading && !onboarded && pathname === '/' && <SpotlightTour onDone={toured} />}
      {loading && <LoadingScreen onDone={loaded} />}
    </GestureHandlerRootView>
  );
}
