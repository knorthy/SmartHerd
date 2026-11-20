import { useState } from 'react';
import { Text } from 'react-native';

import { TabScreen } from '@/components/screen';
import { SyncStatus } from '@/components/sync-status';
import { Button, DataRow, I, Section } from '@/components/ui';
import { kg, shortDate, time } from '@/lib/format';
import { daysToSale, getSettings, latest, unsyncedCount, useHerd, useSaleWeight } from '@/lib/herd';
import { syncNow } from '@/lib/sync';
import { showToast } from '@/lib/toast';
import { S, useTheme } from '@/theme';

export default function Coop() {
  const saleKg = useSaleWeight();
  const { T } = useTheme();
  const herd = useHerd();
  const { goats } = herd;
  const pending = unsyncedCount(herd);
  const { serverUrl } = getSettings();
  const [syncing, setSyncing] = useState(false);
  const members = [...new Set(goats.map((g) => g.member))].sort();
  const totalKg = goats.reduce((n, g) => n + (latest(g)?.weight ?? 0), 0);
  const soon = goats.filter((g) => {
    const d = daysToSale(g);
    return d !== null && d > 0 && d <= 30;
  }).length;

  const sync = async () => {
    setSyncing(true);
    const r = await syncNow();
    setSyncing(false);
    // one toast: a second would replace the first immediately (toast.ts shows one at a time)
    const head = r.offline
      ? 'Can’t reach the SmartHerd server. Records stay saved on this phone.'
      : `Synced. ${r.pushed} sent, ${r.pulled} received${r.estimated > 0 ? `, ${r.estimated} estimated` : ''}.`;
    showToast({ message: [head, ...r.retakes.map((x) => `${x.goat}: retake needed (${x.reason}).`)].join(' ') });
  };

  return (
    <TabScreen title="Co-op" status={<SyncStatus />}>
      <Section title="Herd overview" aside={goats.some((g) => g.demo) ? 'Demo data' : undefined}>
        <DataRow label="Goats" value={String(goats.length)} />
        <DataRow label="Members with goats" value={String(members.length)} />
        <DataRow label={`At sale weight (${saleKg} kg)`} value={String(goats.filter((g) => daysToSale(g) === 0).length)} />
        <DataRow label="Within 30 days of sale" value={String(soon)} />
        <DataRow label="Herd Estimated Weight" value={kg(totalKg)} unit="kg" />
      </Section>

      {members.length > 0 && (
        <Section title="By member" style={{ marginTop: S.xxl }}>
          {members.map((m) => {
            const mine = goats.filter((g) => g.member === m);
            const ready = mine.filter((g) => daysToSale(g) === 0).length;
            return <DataRow key={m} label={m} value={`${mine.length} goats${ready ? ` · ${ready} ready` : ''}`} />;
          })}
        </Section>
      )}

      <Section title="SmartHerd Sync" style={{ marginTop: S.xxl }}>
        <Text style={[T.meta, { marginVertical: S.md }]}>
          Weighing never needs a signal. When the phone is online, sync shares new records with the cooperative.
        </Text>
        <DataRow label="Records waiting" value={String(pending)} />
        {!!herd.queue?.length && <DataRow label="Photos waiting for an estimate" value={String(herd.queue.length)} />}
        <DataRow label="Last sync" value={herd.lastSync ? `${shortDate(herd.lastSync)}, ${time(herd.lastSync)}` : 'Never'} />
        <Button
          label={syncing ? 'Syncing…' : 'Sync now'}
          icon={I.sync}
          variant="tonal"
          onPress={sync}
          disabled={syncing || (!serverUrl && pending === 0)}
          style={{ marginTop: S.lg }}
        />
        <Text style={[T.caption, { marginTop: S.sm }]}>{serverUrl ? `Sharing with ${serverUrl}` : 'No server set. Add one in Profile to share records.'}</Text>
      </Section>
    </TabScreen>
  );
}
