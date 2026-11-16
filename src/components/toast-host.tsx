import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dismissToast, runToastAction, useToast } from '@/lib/toast';
import { makeStyles, R, S, useTheme } from '@/theme';

import { I, Icon } from './ui';

/** Snackbar above the bottom actions: confirmation, or a short window to undo. */
export function ToastHost() {
  const { C } = useTheme();
  const st = useSt();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (toast) AccessibilityInfo.announceForAccessibility?.(toast.message);
  }, [toast]);

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[st.wrap, { bottom: insets.bottom + 100 }]}>
      <Animated.View
        key={toast.id}
        entering={reduce ? undefined : SlideInDown.springify().damping(18)}
        exiting={reduce ? undefined : FadeOutDown.duration(160)}
        style={st.toast}
        accessibilityLiveRegion="polite">
        <Icon name={I.check} size={18} color={C.inverseAccent} />
        <Text style={st.text} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable accessibilityRole="button" onPress={runToastAction} hitSlop={8} style={st.action}>
            <Text style={st.actionText}>{toast.action.label}</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismissToast} hitSlop={8} style={st.action}>
            <Text style={[st.actionText, { opacity: 0.7 }]}>OK</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const useSt = makeStyles((C) =>
  StyleSheet.create({
    wrap: { position: 'absolute', left: S.lg, right: S.lg, zIndex: 20 },
    toast: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 480,
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      paddingLeft: S.lg,
      paddingRight: S.xs,
      minHeight: 56,
      borderRadius: R.md,
      backgroundColor: C.ink,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
    },
    text: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '500', color: C.paper },
    action: { minHeight: 48, minWidth: 64, paddingHorizontal: S.md, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm },
    actionText: { fontSize: 15, fontWeight: '700', color: C.inverseAccent },
  }),
);
