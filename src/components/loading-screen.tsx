import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { S, makeStyles, useTheme } from '@/theme';

import { LogoMark } from './logo';

const ease = Easing.out(Easing.exp);

/**
 * Picks up from the native splash (same mark, same white) and "takes a measurement":
 * the mark settles, a dimension line draws across under the wordmark, then the screen lifts away.
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const { C, T } = useTheme();
  const st = useSt();
  const reduce = useReducedMotion();
  const mark = useSharedValue(reduce ? 1 : 0);
  const line = useSharedValue(reduce ? 1 : 0);
  const words = useSharedValue(reduce ? 1 : 0);
  const out = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const finish = () => onDone();
    if (reduce) {
      out.set(withDelay(500, withTiming(0, { duration: 200 }, (ok) => ok && scheduleOnRN(finish))));
      return;
    }
    mark.set(withTiming(1, { duration: 520, easing: ease }));
    words.set(withDelay(260, withTiming(1, { duration: 420, easing: ease })));
    line.set(withDelay(420, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) })));
    out.set(withSequence(withDelay(1450, withTiming(0, { duration: 320, easing: ease }, (ok) => ok && scheduleOnRN(finish)))));
  }, [reduce, mark, line, words, out, onDone]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.get(),
    transform: [{ translateY: (1 - mark.get()) * 14 }, { scale: 0.92 + mark.get() * 0.08 }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: words.get(), transform: [{ translateY: (1 - words.get()) * 8 }] }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.get() }] }));
  const tickStyle = useAnimatedStyle(() => ({ opacity: line.get() > 0.98 ? 1 : 0 }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: out.get() }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, rootStyle]} accessibilityLabel="SmartHerd is loading">
      <Animated.View style={markStyle}>
        <LogoMark size={112} />
      </Animated.View>
      <Animated.View style={[{ alignItems: 'center', gap: S.xs }, wordStyle]}>
        <Text style={[T.title, { color: C.ink }]}>SmartHerd</Text>
        <Text style={T.meta}>Goat weight estimation</Text>
      </Animated.View>
      <View style={st.measure}>
        <Animated.View style={[st.tick, tickStyle]} />
        <Animated.View style={[st.line, lineStyle]} />
        <Animated.View style={[st.tick, tickStyle]} />
      </View>
    </Animated.View>
  );
}

const useSt = makeStyles((C) => StyleSheet.create({
  root: { backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: S.lg, zIndex: 10 },
  measure: { flexDirection: 'row', alignItems: 'center', width: 160, marginTop: S.sm },
  line: { flex: 1, height: 1.5, backgroundColor: C.green, transformOrigin: 'left' },
  tick: { width: 1.5, height: 10, backgroundColor: C.green },
}));
