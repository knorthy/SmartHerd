import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { C, S, T } from '@/theme';

import { I, Icon } from './ui';

const MIN = 1;
const MAX = 4;

type Dim = { label: string; value: string };

/**
 * A photo set as a bulletin figure: dimension lines in the margins, zoom/rotate controls, drag to pan.
 * shortcut: dimension lines annotate the frame, not detected keypoints; draw them at keypoints once the pose model runs.
 */
export function Figure({ uri, caption, horizontal, vertical }: { uri?: string; caption: string; horizontal: Dim; vertical?: Dim }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const rot = useSharedValue(0);
  const [zoom, setZoom] = useState(100);

  const pan = usePanGesture({
    onUpdate: (e) => {
      'worklet';
      tx.value = sx.value + e.translationX;
      ty.value = sy.value + e.translationY;
    },
    onDeactivate: () => {
      'worklet';
      sx.value = tx.value;
      sy.value = ty.value;
    },
  });
  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(MAX, Math.max(MIN, saved.value * e.scale));
    },
    onDeactivate: () => {
      'worklet';
      saved.value = scale.value;
      scheduleOnRN(setZoom, Math.round(scale.value * 100));
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));

  const zoomBy = (f: number) => {
    const next = Math.min(MAX, Math.max(MIN, saved.get() * f));
    saved.set(next);
    scale.set(withTiming(next, { duration: 180 }));
    if (next === 1) {
      tx.set(withTiming(0));
      ty.set(withTiming(0));
      sx.set(0);
      sy.set(0);
    }
    setZoom(Math.round(next * 100));
  };

  return (
    <View style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={[st.frame, { flex: 1 }]}>
          {uri ? (
            <GestureDetector gesture={gesture}>
              <Animated.View style={[StyleSheet.absoluteFill, animated]}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={caption} />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={st.none}>
              <Text style={T.meta}>No photo</Text>
            </View>
          )}
        </View>
        {vertical && (
          <View style={st.vMargin} accessibilityLabel={`${vertical.label} ${vertical.value}`}>
            <View style={st.tickH} />
            <View style={st.vLine} />
            <Text style={st.vText}>{vertical.value}</Text>
            <View style={st.vLine} />
            <View style={st.tickH} />
          </View>
        )}
      </View>

      <View style={[st.hRow, vertical && { marginRight: V_MARGIN }]} accessibilityLabel={`${horizontal.label} ${horizontal.value}`}>
        <View style={st.tickV} />
        <View style={st.hLine} />
        <Text style={st.dimText}>
          {horizontal.label} {horizontal.value}
        </Text>
        <View style={st.hLine} />
        <View style={st.tickV} />
      </View>

      <View style={st.controls}>
        <Text style={T.caption}>{caption}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ctl label="Zoom out" icon={I.minus} onPress={() => zoomBy(1 / 1.25)} disabled={!uri || zoom <= 100} />
          <Text style={[T.label, st.zoom]}>{zoom}%</Text>
          <Ctl label="Zoom in" icon={I.plus} onPress={() => zoomBy(1.25)} disabled={!uri || zoom >= MAX * 100} />
          <Ctl label="Rotate" icon={I.rotate} onPress={() => rot.set(withTiming(rot.get() + 90, { duration: 220 }))} disabled={!uri} />
        </View>
      </View>
    </View>
  );
}

function Ctl({ label, icon, onPress, disabled }: { label: string; icon: typeof I.plus; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [st.ctl, pressed && { backgroundColor: C.greenTint }, disabled && { opacity: 0.35 }]}>
      <Icon name={icon} size={20} color={C.ink} />
    </Pressable>
  );
}

const V_MARGIN = 52;

const st = StyleSheet.create({
  frame: { aspectRatio: 4 / 3, overflow: 'hidden', backgroundColor: C.greenTint, borderWidth: 1, borderColor: C.ink },
  none: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vMargin: { width: V_MARGIN, alignItems: 'center' },
  vLine: { flex: 1, width: 1, backgroundColor: C.green },
  tickH: { width: 12, height: 1, backgroundColor: C.green },
  vText: { fontSize: 12, fontWeight: '600', color: C.green, paddingVertical: S.xs, fontVariant: ['tabular-nums'] },
  hRow: { flexDirection: 'row', alignItems: 'center' },
  hLine: { flex: 1, height: 1, backgroundColor: C.green },
  tickV: { width: 1, height: 12, backgroundColor: C.green },
  dimText: { fontSize: 12, fontWeight: '600', color: C.green, paddingHorizontal: S.sm, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctl: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  zoom: { minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
