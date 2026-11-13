import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SALE_WEIGHT_KG } from '@/lib/estimate';
import { makeStyles, S, useTheme } from '@/theme';

import { tourTargets } from './tour-target';
import { Button } from './ui';

type Step = { target?: string; title: string; body: string; radius?: number };

export const TOUR: Step[] = [
  {
    title: 'Welcome to SmartHerd',
    body: 'A quick tour of the controls you will use in the pen. It takes about thirty seconds.',
  },
  {
    target: 'weigh',
    radius: 32,
    title: 'Weigh a goat',
    body: 'Start here. Choose a goat, take a side photo and a top photo, and get its Estimated Weight. No scale, no restraint.',
  },
  {
    target: 'board-main',
    radius: 10,
    title: 'The sale board',
    body: `Your herd ranked by days to ${SALE_WEIGHT_KG} kg. The thin tape under each name shows how close a goat is; ochre rows are ready to sell.`,
  },
  {
    target: 'sync',
    radius: 14,
    title: 'Works offline',
    body: 'Every weighing is saved on this phone first. This shows what is still waiting to sync with the cooperative.',
  },
  {
    target: 'tab-goats',
    radius: 26,
    title: 'Goats',
    body: 'Every registered goat with its growth record. Register new goats here.',
  },
  {
    target: 'tab-coop',
    radius: 26,
    title: 'Co-op',
    body: 'Totals for the whole cooperative, goats per member, and SmartHerd Sync.',
  },
  {
    target: 'tab-profile',
    radius: 26,
    title: 'Profile and settings',
    body: 'Your name, light or dark theme, and this tour again whenever you need it.',
  },
];

type Rect = { x: number; y: number; w: number; h: number };

const PAD = 8;
const ease = Easing.out(Easing.exp);

/**
 * Coach marks over the live screen: everything dims except one control, a card explains it,
 * and Next / Skip walk the list. Steps whose control is not on screen are skipped.
 */
export function SpotlightTour({ onDone }: { onDone: () => void }) {
  const { C, T } = useTheme();
  const st = useSt();
  const reduce = useReducedMotion();
  const win = useWindowDimensions();
  // the scrim is the border of one ring around the hole, just thick enough to cover the screen,
  // so the hole keeps true rounded corners on every platform
  const BIG = Math.ceil(Math.max(win.width, win.height) * 1.05);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(220);
  const insets = useSafeAreaInsets();
  const step = TOUR[i];
  const last = i === TOUR.length - 1;

  // hole geometry, animated between targets
  const hx = useSharedValue(win.width / 2);
  const hy = useSharedValue(win.height / 2);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);
  const hr = useSharedValue(0);
  const pulse = useSharedValue(0);

  const next = useCallback(() => (last ? onDone() : setI((n) => n + 1)), [last, onDone]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDone();
      return true;
    });
    return () => sub.remove();
  }, [onDone]);

  // measure the current target (retry briefly while screens settle); skip the step if it never appears
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const place = (r: Rect | null) => {
      setRect(r);
      const t = { duration: reduce ? 0 : 380, easing: ease };
      const to = r ?? { x: win.width / 2, y: win.height / 2, w: 0, h: 0 };
      const pad = r ? PAD : 0;
      hx.set(withTiming(to.x - pad, t));
      hy.set(withTiming(to.y - pad, t));
      hw.set(withTiming(to.w + pad * 2, t));
      hh.set(withTiming(to.h + pad * 2, t));
      hr.set(withTiming(r ? (step.radius ?? 12) : 0, t));
    };
    const measure = () => {
      if (!step.target) return place(null);
      const v = tourTargets.get(step.target);
      if (!v) {
        if (tries++ < 6) timer = setTimeout(measure, 120);
        else next();
        return;
      }
      v.measureInWindow((x, y, w, h) => (w > 0 && h > 0 ? place({ x, y, w, h }) : tries++ < 6 ? (timer = setTimeout(measure, 120)) : next()));
    };
    measure();
    AccessibilityInfo.announceForAccessibility?.(`${step.title}. ${step.body}`);
    return () => clearTimeout(timer);
  }, [i, step, win.width, win.height, reduce, next, hx, hy, hw, hh, hr]);

  useEffect(() => {
    pulse.set(reduce ? 0 : withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1));
  }, [reduce, pulse]);

  const scrim = useAnimatedStyle(() => ({
    borderWidth: BIG,
    left: hx.get() - BIG,
    top: hy.get() - BIG,
    width: hw.get() + BIG * 2,
    height: hh.get() + BIG * 2,
    borderRadius: hr.get() + BIG,
  }));
  const ring = useAnimatedStyle(() => ({
    left: hx.get() - 3,
    top: hy.get() - 3,
    width: hw.get() + 6,
    height: hh.get() + 6,
    borderRadius: hr.get() + 3,
    opacity: hw.get() > 1 ? 0.55 + pulse.get() * 0.45 : 0,
    transform: [{ scale: 1 + pulse.get() * 0.02 }],
  }));

  const CARD_W = Math.min(win.width - S.lg * 2, 360);
  // card goes on the side with more room, then is clamped on screen; a clamped card that would cover
  // the target (a tall list) drops its caret and sits at the screen edge instead
  const GAP = PAD + 16;
  const margin = S.lg + insets.top;
  const spaceBelow = rect ? win.height - (rect.y + rect.h) : 0;
  const below = rect ? spaceBelow >= rect.y : false;
  const cardLeft = rect ? Math.max(S.lg, Math.min(rect.x + rect.w / 2 - CARD_W / 2, win.width - CARD_W - S.lg)) : (win.width - CARD_W) / 2;
  const caretLeft = rect ? Math.max(20, Math.min(rect.x + rect.w / 2 - cardLeft - 8, CARD_W - 36)) : 0;
  const ideal = !rect ? win.height / 2 - cardH / 2 : below ? rect.y + rect.h + GAP : rect.y - GAP - cardH;
  const top = Math.max(margin, Math.min(ideal, win.height - cardH - S.lg - insets.bottom));
  const showCaret = !!rect && Math.abs(top - ideal) < 1;
  const cardPos = { top };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View pointerEvents="none" style={[st.scrim, { borderColor: C.scrim }, scrim]} />
      <Animated.View pointerEvents="none" style={[st.ring, ring]} />
      {/* swallow taps on the dimmed screen */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} accessible={false} />

      <Animated.View
        key={i}
        entering={reduce ? undefined : FadeIn.duration(260).delay(rect ? 180 : 0)}
        exiting={reduce ? undefined : FadeOut.duration(100)}
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
        style={[st.card, { width: CARD_W, left: cardLeft }, cardPos]}>
        {showCaret && <View style={[st.caret, below ? st.caretTop : st.caretBottom, { left: caretLeft }]} />}
        <View style={st.progress} accessibilityLabel={`Step ${i + 1} of ${TOUR.length}`}>
          {TOUR.map((_, k) => (
            <View key={k} style={[st.seg, { backgroundColor: k <= i ? C.green : C.rule }]} />
          ))}
          <Text style={[T.label, st.count]}>
            {i + 1}/{TOUR.length}
          </Text>
        </View>
        <Text style={[T.heading, { fontSize: 20, lineHeight: 26 }]} accessibilityRole="header">
          {step.title}
        </Text>
        <Text style={[T.meta, { fontSize: 15, lineHeight: 22 }]}>{step.body}</Text>
        <View style={st.actions}>
          {!last ? <Button label="Skip tour" variant="text" onPress={onDone} style={{ marginLeft: -S.md }} /> : <View />}
          <Button label={last ? 'Done' : i === 0 ? 'Show me' : 'Next'} onPress={next} style={{ minWidth: 120 }} />
        </View>
      </Animated.View>
    </View>
  );
}

const useSt = makeStyles((C) =>
  StyleSheet.create({
    scrim: { position: 'absolute' },
    ring: { position: 'absolute', borderWidth: 2, borderColor: C.green },
    card: {
      position: 'absolute',
      backgroundColor: C.paper,
      borderRadius: 20,
      padding: S.lg + 4,
      gap: S.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.glassEdge,
      boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
    },
    caret: { position: 'absolute', width: 16, height: 16, backgroundColor: C.paper, transform: [{ rotate: '45deg' }] },
    caretTop: { top: -8 },
    caretBottom: { bottom: -8 },
    progress: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: S.xs },
    seg: { flex: 1, height: 3, borderRadius: 2 },
    count: { marginLeft: S.sm, fontVariant: ['tabular-nums'] },
    actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.sm },
  }),
);
