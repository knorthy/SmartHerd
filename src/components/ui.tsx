import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps, type ViewStyle } from 'react-native';

import { C, S, T } from '@/theme';

type IconName = { ios: string; android: string; web: string };

export function Icon({ name, size = 22, color = C.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  return <SymbolView name={name as SymbolViewProps['name']} size={size} tintColor={color} />;
}

/** Icon names shared across platforms: SF Symbols on iOS, Material Symbols elsewhere. */
export const I = {
  board: { ios: 'list.number', android: 'leaderboard', web: 'leaderboard' },
  goats: { ios: 'pawprint', android: 'pets', web: 'pets' },
  coop: { ios: 'person.3', android: 'groups', web: 'groups' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  library: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  rotate: { ios: 'rotate.right', android: 'rotate_right', web: 'rotate_right' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  offline: { ios: 'icloud.slash', android: 'cloud_off', web: 'cloud_off' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} satisfies Record<string, IconName>;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined' | 'text' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: IconName;
};

export function Button({ label, onPress, variant = 'filled', disabled, style, icon }: ButtonProps) {
  const filled = variant === 'filled';
  const fg = filled ? C.paper : variant === 'outlined' ? C.ink : variant === 'danger' ? C.error : C.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        b.base,
        filled && { backgroundColor: pressed ? C.greenPressed : C.green },
        variant === 'outlined' && { borderWidth: 1, borderColor: C.ink, backgroundColor: pressed ? C.greenTint : C.paper },
        (variant === 'text' || variant === 'danger') && { backgroundColor: pressed ? C.greenTint : 'transparent', paddingHorizontal: S.md },
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

/** Bulletin-style section heading: label above a full hairline rule. */
export function Section({ title, aside, children, style }: { title: string; aside?: ReactNode; children?: ReactNode; style?: ViewStyle }) {
  return (
    <View style={style}>
      <View style={sec.head}>
        <Text style={T.heading}>{title}</Text>
        {typeof aside === 'string' ? <Text style={T.meta}>{aside}</Text> : aside}
      </View>
      {children}
    </View>
  );
}

const sec = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    marginBottom: S.xs,
  },
});

/** Label/value row with a hairline under it, figures tabular. */
export function DataRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={dr.row}>
      <Text style={T.body}>{label}</Text>
      <Text style={T.bodyNum}>
        {value}
        {unit ? <Text style={T.meta}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const dr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.rule,
    minHeight: 48,
    alignItems: 'center',
  },
});

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: S.xs }}>
      <Text style={T.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.ink2}
        selectionColor={C.green}
        cursorColor={C.green}
        style={[f.input, error ? { borderColor: C.error } : null]}
        {...props}
      />
      {error ? <Text style={[T.meta, { color: C.error }]}>{error}</Text> : hint ? <Text style={T.meta}>{hint}</Text> : null}
    </View>
  );
}

const f = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: C.ink2,
    borderRadius: 8,
    paddingHorizontal: S.md,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.paper,
  },
});

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string }[];
  value: V | null;
  onChange: (v: V) => void;
  label: string;
}) {
  return (
    <View style={{ gap: S.xs }}>
      <Text style={T.label}>{label}</Text>
      <View style={sg.wrap} accessibilityRole="radiogroup">
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[sg.item, i > 0 && sg.divider, on && { backgroundColor: C.greenTint }]}>
              {on && <Icon name={I.check} size={18} color={C.green} />}
              <Text style={[T.body, on && { color: C.green, fontWeight: '600' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const sg = StyleSheet.create({
  wrap: { flexDirection: 'row', borderWidth: 1, borderColor: C.ink2, borderRadius: 26, overflow: 'hidden' },
  item: { flex: 1, minHeight: 48, flexDirection: 'row', gap: S.xs, alignItems: 'center', justifyContent: 'center' },
  divider: { borderLeftWidth: 1, borderLeftColor: C.ink2 },
});

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={{ paddingVertical: S.xxl, gap: S.sm }}>
      <Text style={T.heading}>{title}</Text>
      <Text style={[T.meta, { maxWidth: 320 }]}>{body}</Text>
      {action ? <View style={{ marginTop: S.md, alignSelf: 'flex-start' }}>{action}</View> : null}
    </View>
  );
}
