import { Text } from 'react-native';

import { TabScreen } from '@/components/screen';
import { SyncStatus } from '@/components/sync-status';
import { Button, DataRow, I, Section } from '@/components/ui';
import { SALE_WEIGHT_KG } from '@/lib/estimate';
import { kg, shortDate, time } from '@/lib/format';
import { daysToSale, latest, syncNow, unsyncedCount, useHerd } from '@/lib/herd';
import { S, useTheme } from '@/theme';

export default function Coop() {
  const { T } = useTheme();
  const herd = useHerd();
  const { goats } = herd;
  const pending = unsyncedCount(herd);
  const members = [...new Set(goats.map((g) => g.member))].sort();
  const totalKg = goats.reduce((n, g) => n + (latest(g)?.weight ?? 0), 0);
  const soon = goats.filter((g) => {
    const d = daysToSale(g);
    return d !== null && d > 0 && d <= 30;
  }).length;

  return (
    <TabScreen title="Co-op" status={<SyncStatus />}>
      <Section title="Herd overview" aside={goats.some((g) => g.demo) ? 'Demo data' : undefined}>
        <DataRow label="Goats" value={String(goats.length)} />
        <DataRow label="Members with goats" value={String(members.length)} />
        <DataRow label={`At sale weight (${SALE_WEIGHT_KG} kg)`} value={String(goats.filter((g) => daysToSale(g) === 0).length)} />
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
        <DataRow label="Last sync" value={herd.lastSync ? `${shortDate(herd.lastSync)}, ${time(herd.lastSync)}` : 'Never'} />
        <Button label="Sync now" icon={I.sync} variant="outlined" onPress={syncNow} disabled={pending === 0} style={{ marginTop: S.lg }} />
        <Text style={[T.caption, { marginTop: S.sm }]}>Prototype: sync is simulated on this device.</Text>
      </Section>
    </TabScreen>
  );
}
