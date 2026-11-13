import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S } from '@/theme';

import { I, Icon } from './ui';

export const TAB_BAR_HEIGHT = 68;

const ICONS = { index: I.board, goats: I.goats, coop: I.coop } as const;

/** Space a tab screen leaves at the bottom so content clears the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, S.md) + S.lg;
}

/**
 * Floating frosted bar: real blur on iOS and web; Android draws a translucent pane
 * (shortcut: Android blur needs a BlurTargetView around every scene; add it if the frosting matters there).
 */
export function GlassTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [itemW, setItemW] = useState(0);
  // slots: Board, Goats, [Weigh], Co-op — the action occupies slot 2
  const slotOf = (i: number) => (i >= 2 ? i + 1 : i);
  const x = useSharedValue(0);
  useEffect(() => {
    const to = slotOf(state.index) * itemW;
    x.set(reduce ? to : withSpring(to, { damping: 20, stiffness: 220 }));
  }, [state.index, itemW, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const tab = (route: (typeof state.routes)[number], i: number) => {
    const focused = state.index === i;
    const { options } = descriptors[route.key];
    const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
    const onPress = () => {
      const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        style={st.item}>
        <Icon name={ICONS[route.name as keyof typeof ICONS] ?? I.board} size={22} color={focused ? C.green : C.ink2} />
        <Text style={[st.label, { color: focused ? C.green : C.ink2 }]}>{label}</Text>
      </Pressable>
    );
  };

  const items = state.routes.map(tab);
  items.splice(
    2,
    0,
    <View key="weigh" style={st.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New weighing"
        onPress={() => router.push('/weigh')}
        style={({ pressed }) => [st.action, pressed && { backgroundColor: C.greenPressed, transform: [{ scale: 0.96 }] }]}>
        <Icon name={I.camera} size={22} color={C.paper} />
      </Pressable>
    </View>,
  );

  return (
    <View pointerEvents="box-none" style={[st.wrap, { bottom: Math.max(insets.bottom, S.md) }]}>
      <View style={st.shadow}>
        <BlurView intensity={40} tint="light" style={st.glass} {...(Platform.OS === 'android' ? { blurMethod: 'none' as const } : null)}>
          <View style={st.sheen} pointerEvents="none" />
          <View style={st.row} onLayout={(e) => setItemW((e.nativeEvent.layout.width - S.sm * 2) / 4)}>
            {itemW > 0 && <Animated.View style={[st.pill, { width: itemW }, pill]} pointerEvents="none" />}
            {items}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: S.lg, right: S.lg, alignItems: 'center' },
  shadow: {
    width: '100%',
    maxWidth: 440,
    borderRadius: TAB_BAR_HEIGHT / 2,
    boxShadow: '0 10px 30px rgba(17, 22, 20, 0.12), 0 1px 3px rgba(17, 22, 20, 0.08)',
  },
  glass: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17, 22, 20, 0.12)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.55)',
  },
  // the glass edge: a brighter top line, like light catching a pane
  sheen: { position: 'absolute', left: 24, right: 24, top: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  row: { flex: 1, flexDirection: 'row', paddingHorizontal: S.sm },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  pill: { position: 'absolute', left: S.sm, top: 8, bottom: 8, borderRadius: 26, backgroundColor: 'rgba(15, 92, 69, 0.10)' },
  action: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
