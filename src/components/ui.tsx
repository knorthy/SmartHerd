import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps, type ViewStyle } from 'react-native';

import { makeStyles, R, S, useTheme } from '@/theme';

export type IconName = { ios: string; android: string; web: string };

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const { C } = useTheme();
  return <SymbolView name={name as SymbolViewProps['name']} size={size} tintColor={color ?? C.ink} />;
}

/** Icon names shared across platforms: SF Symbols on iOS, Material Symbols elsewhere. */
export const I = {
  board: { ios: 'list.number', android: 'leaderboard', web: 'leaderboard' },
  goats: { ios: 'pawprint', android: 'pets', web: 'pets' },
  coop: { ios: 'person.3', android: 'groups', web: 'groups' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  library: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  rotate: { ios: 'rotate.right', android: 'rotate_right', web: 'rotate_right' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  offline: { ios: 'icloud.slash', android: 'cloud_off', web: 'cloud_off' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  sun: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  moon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  auto: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
  tour: { ios: 'hand.point.up.left', android: 'touch_app', web: 'touch_app' },
} satisfies Record<string, IconName>;

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** filled: the one primary action. tonal: secondary actions. text / danger: quiet inline actions. */
  variant?: 'filled' | 'tonal' | 'text' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: IconName;
};

export function Button({ label, onPress, variant = 'filled', disabled, style, icon }: ButtonProps) {
  const { C } = useTheme();
  const filled = variant === 'filled';
  const tonal = variant === 'tonal';
  const fg = filled ? C.onGreen : tonal ? C.green : variant === 'danger' ? C.error : C.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        b.base,
        filled && { backgroundColor: pressed ? C.greenPressed : C.green },
        tonal && { backgroundColor: pressed ? C.surface2 : C.greenTint },
        (variant === 'text' || variant === 'danger') && { backgroundColor: pressed ? C.greenTint : 'transparent', paddingHorizontal: S.md },
        pressed && { transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      {icon && <Icon name={icon} size={20} color={fg} />}
      <Text style={[b.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const b = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: S.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  label: { fontSize: 16, fontWeight: '600' },
});

const useUi = makeStyles((C) =>
  StyleSheet.create({
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: S.xs,
      marginBottom: S.sm,
    },
    panel: {
      backgroundColor: C.surface,
      borderRadius: R.md,
      paddingHorizontal: S.lg,
      paddingVertical: S.sm,
      boxShadow: '0 1px 2px rgba(10, 30, 20, 0.04), 0 4px 16px rgba(10, 30, 20, 0.04)',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: S.md,
      minHeight: 48,
      alignItems: 'center',
      gap: S.md,
    },
    input: {
      minHeight: 52,
      borderWidth: 1.5,
      borderColor: 'transparent',
      borderRadius: R.sm,
      paddingHorizontal: S.lg,
      fontSize: 16,
      color: C.ink,
      backgroundColor: C.surface2,
    },
    segWrap: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 26, padding: 4, gap: 4 },
    segItem: { flex: 1, minHeight: 44, borderRadius: 22, flexDirection: 'row', gap: S.xs, alignItems: 'center', justifyContent: 'center' },
    segOn: { backgroundColor: C.surface, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' },
  }),
);

/** A raised, rounded surface for grouped content. Separation comes from space and tone, never rules. */
export function Panel({ children, style, flush }: { children: ReactNode; style?: ViewStyle; flush?: boolean }) {
  const ui = useUi();
  return <View style={[ui.panel, flush && { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }, style]}>{children}</View>;
}

/** Group title above a panel; pass `bare` when the children bring their own surfaces. */
export function Section({
  title,
  aside,
  children,
  style,
  bare,
}: {
  title: string;
  aside?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
  bare?: boolean;
}) {
  const { T } = useTheme();
  const ui = useUi();
  return (
    <View style={style}>
      <View style={ui.sectionHead}>
        <Text style={T.heading}>{title}</Text>
        {typeof aside === 'string' ? <Text style={T.meta}>{aside}</Text> : aside}
      </View>
      {bare ? children : <Panel>{children}</Panel>}
    </View>
  );
}

/** Label/value row inside a panel, figures tabular. */
export function DataRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const { T } = useTheme();
  const ui = useUi();
  return (
    <View style={ui.row}>
      <Text style={[T.body, { flexShrink: 1 }]}>{label}</Text>
      <Text style={[T.bodyNum, { fontWeight: '600' }]}>
        {value}
        {unit ? <Text style={T.meta}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const { C, T } = useTheme();
  const ui = useUi();
  return (
    <View style={{ gap: S.xs + 2 }}>
      <Text style={T.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.ink2}
        selectionColor={C.green}
        cursorColor={C.green}
        style={[ui.input, error ? { borderColor: C.error } : null]}
        {...props}
      />
      {error ? <Text style={[T.meta, { color: C.error }]}>{error}</Text> : hint ? <Text style={T.meta}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string; icon?: IconName }[];
  value: V | null;
  onChange: (v: V) => void;
  label: string;
}) {
  const { C, T } = useTheme();
  const ui = useUi();
  return (
    <View style={{ gap: S.xs + 2 }}>
      <Text style={T.label}>{label}</Text>
      <View style={ui.segWrap} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[ui.segItem, on && ui.segOn]}>
              {o.icon && <Icon name={o.icon} size={18} color={on ? C.green : C.ink2} />}
              <Text style={[T.body, { color: on ? C.green : C.ink2, fontWeight: on ? '600' : '500' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const { T } = useTheme();
  return (
    <View style={{ paddingVertical: S.xl, gap: S.sm }}>
      <Text style={T.heading}>{title}</Text>
      <Text style={[T.meta, { maxWidth: 320 }]}>{body}</Text>
      {action ? <View style={{ marginTop: S.md, alignSelf: 'flex-start' }}>{action}</View> : null}
    </View>
  );
}
