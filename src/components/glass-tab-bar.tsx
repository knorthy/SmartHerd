import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, S, useTheme } from '@/theme';

import { TourTarget } from './tour-target';
import { I, Icon } from './ui';

export const TAB_BAR_HEIGHT = 68;

const ICONS = { index: I.board, goats: I.goats, coop: I.coop, profile: I.profile } as const;
const SLOTS = 5;
const ACTION_SLOT = 2;

/** Space a tab screen leaves at the bottom so content clears the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, S.md) + S.lg;
}

/**
 * Floating frosted bar of five equal slots: two tabs, the Weigh action at the centre, two tabs.
 * Real blur on iOS and web; Android draws a near-opaque pane
 * (shortcut: Android blur needs a BlurTargetView around every scene; add it if the frosting matters there).
 */
export function GlassTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { C, scheme } = useTheme();
  const st = useSt();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [slotW, setSlotW] = useState(0);
  const slotOf = (i: number) => (i >= ACTION_SLOT ? i + 1 : i);
  const x = useSharedValue(0);
  useEffect(() => {
    const to = slotOf(state.index) * slotW;
    x.set(reduce ? to : withSpring(to, { damping: 20, stiffness: 220 }));
  }, [state.index, slotW, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const items = state.routes.map((route, i) => {
    const focused = state.index === i;
    const { options } = descriptors[route.key];
    const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
    const onPress = () => {
      const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <TourTarget key={route.key} id={`tab-${route.name}`} style={st.slot}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} onPress={onPress} style={st.item}>
          <Icon name={ICONS[route.name as keyof typeof ICONS] ?? I.board} size={22} color={focused ? C.green : C.ink2} />
          <Text style={[st.label, { color: focused ? C.green : C.ink2 }]} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      </TourTarget>
    );
  });
  items.splice(
    ACTION_SLOT,
    0,
    <View key="weigh" style={[st.slot, st.item]}>
      <TourTarget id="weigh">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New weighing"
          onPress={() => router.push('/weigh')}
          style={({ pressed }) => [st.action, pressed && { backgroundColor: C.greenPressed, transform: [{ scale: 0.96 }] }]}>
          <Icon name={I.camera} size={24} color={C.onGreen} />
        </Pressable>
      </TourTarget>
    </View>,
  );

  return (
    <View pointerEvents="box-none" style={[st.wrap, { bottom: Math.max(insets.bottom, S.md) }]}>
      <View style={st.shadow}>
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={st.glass}
          {...(Platform.OS === 'android' ? { blurMethod: 'none' as const } : null)}>
          <View style={st.row} onLayout={(e) => setSlotW((e.nativeEvent.layout.width - S.xs * 2) / SLOTS)}>
            {slotW > 0 && <Animated.View style={[st.pill, { width: slotW }, pill]} pointerEvents="none" />}
            {items}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const useSt = makeStyles((C) =>
  StyleSheet.create({
    wrap: { position: 'absolute', left: S.md, right: S.md, alignItems: 'center' },
    shadow: {
      width: '100%',
      maxWidth: 480,
      borderRadius: TAB_BAR_HEIGHT / 2,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08)',
    },
    glass: {
      height: TAB_BAR_HEIGHT,
      borderRadius: TAB_BAR_HEIGHT / 2,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.glassEdge,
      backgroundColor: Platform.OS === 'android' ? C.glassSolid : C.glass,
    },
    row: { flex: 1, flexDirection: 'row', paddingHorizontal: S.xs },
    slot: { flex: 1 },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
    label: { fontSize: 12, fontWeight: '600' },
    pill: { position: 'absolute', left: S.xs, top: 8, bottom: 8, borderRadius: 26, backgroundColor: C.greenTint },
    action: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  }),
);
