import { Text, View } from 'react-native';

import { time } from '@/lib/format';
import { unsyncedCount, useHerd } from '@/lib/herd';
import { S, useTheme } from '@/theme';

import { I, Icon } from './ui';

export function SyncStatus() {
  const { C, T } = useTheme();
  const herd = useHerd();
  const pending = unsyncedCount(herd);
  const text = pending > 0 ? `${pending} not synced` : herd.lastSync ? `Synced ${time(herd.lastSync)}` : 'Saved on this phone';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs }} accessibilityLabel={text}>
      <Icon name={pending > 0 ? I.offline : I.sync} size={16} color={pending > 0 ? C.ink2 : C.green} />
      <Text style={T.meta}>{text}</Text>
    </View>
  );
}
