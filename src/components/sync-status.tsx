import { Text, View } from 'react-native';

import { time } from '@/lib/format';
import { unsyncedCount, useHerd } from '@/lib/herd';
import { S, useTheme } from '@/theme';

import { I, Icon } from './ui';

export function SyncStatus() {
  const { C, T } = useTheme();
  const herd = useHerd();
  const pending = unsyncedCount(herd);
  // offline is the normal state in the pen, so waiting records read as saved, not as a fault
  const text = pending > 0 ? `Saved offline · ${pending} to sync` : herd.lastSync ? `Synced ${time(herd.lastSync)}` : 'Saved on this phone';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs }} accessibilityLabel={text}>
      <Icon name={pending > 0 ? I.check : I.sync} size={16} color={pending > 0 ? C.ink2 : C.green} />
      <Text style={T.meta}>{text}</Text>
    </View>
  );
}
