import { apiBase, pullRecords, pushRecord, requestEstimate, type CloudRecord } from './api';
import { STAGES } from './estimate';
import { addWeighing, applySync, dropCapture, getState, type Goat, type Weighing } from './herd';

export type SyncSummary = { offline: boolean; estimated: number; retakes: { goat: string; reason: string }[]; pushed: number; pulled: number };

/** Same shape the Pi posts (pi_device.py), plus `source` and `goat` so other phones can create the goat. */
export function toRecord(g: Goat, w: Weighing): CloudRecord {
  return {
    uid: w.id,
    goat_id: g.id,
    stage: w.stage,
    ts: new Date(w.at).toISOString(),
    side_dist_cm: w.distanceCm,
    top_dist_cm: w.topDistanceCm ?? w.distanceCm,
    measurements: { body_length_cm: w.bodyLength, chest_height_cm: w.chestHeight, chest_width_cm: w.chestWidth, heart_girth_cm: w.heartGirth },
    weight_kg: w.weight,
    validated: false,
    retake: false,
    stage_range_ok: w.stageRangeOk,
    source: 'app',
    goat: { name: g.name, tag: g.tag, member: g.member },
  };
}

/** Pure: applies server tombstones and adds records this phone does not have yet. Demo goats are never touched. */
export function mergeRecords(goats: Goat[], recs: CloudRecord[]): { goats: Goat[]; pulled: number } {
  const dead = new Set(recs.filter((r) => r.deleted).map((r) => r.uid));
  let out = goats.map((g) => (g.demo || !g.weighings.some((w) => dead.has(w.id)) ? g : { ...g, weighings: g.weighings.filter((w) => !dead.has(w.id)) }));
  const have = new Set(out.flatMap((g) => g.weighings.map((w) => w.id)));
  let pulled = 0;
  for (const r of recs) {
    const at = Date.parse(r.ts ?? '');
    const weight = r.weight_kg;
    const goatId = r.goat_id;
    const stage = r.stage;
    if (r.deleted || r.retake || typeof weight !== 'number' || !Number.isFinite(weight) || !Number.isFinite(at) || have.has(r.uid)) continue;
    if (!goatId || !stage || !STAGES.includes(stage)) continue;
    have.add(r.uid);
    const m = r.measurements ?? {};
    const w: Weighing = {
      id: r.uid,
      at,
      weight,
      bodyLength: m.body_length_cm ?? 0,
      chestHeight: m.chest_height_cm ?? 0,
      chestWidth: m.chest_width_cm ?? 0,
      heartGirth: m.heart_girth_cm ?? 0,
      stage,
      distanceCm: r.side_dist_cm ?? 0,
      topDistanceCm: r.top_dist_cm,
      synced: true,
      source: 'server',
      stageRangeOk: r.stage_range_ok,
    };
    let g = out.find((x) => !x.demo && x.id === goatId) ?? out.find((x) => !x.demo && x.tag === goatId);
    if (!g) {
      g = { id: goatId, name: r.goat?.name ?? goatId, tag: r.goat?.tag ?? goatId, member: r.goat?.member ?? 'Cooperative', stage, weighings: [] };
      out = [...out, g];
    }
    const weighings = [...g.weighings, w].sort((a, b) => a.at - b.at);
    const next = { ...g, weighings, stage: weighings[weighings.length - 1].stage };
    out = out.map((x) => (x === g ? next : x));
    pulled++;
  }
  return { goats: out, pulled };
}

const markSynced = (id: string) =>
  applySync({ goats: getState().goats.map((g) => ({ ...g, weighings: g.weighings.map((w) => (w.id === id ? { ...w, synced: true } : w)) })) });

async function run(): Promise<SyncSummary> {
  const sum: SyncSummary = { offline: false, estimated: 0, retakes: [], pushed: 0, pulled: 0 };
  // simulated mode: nothing to talk to, so local records count as shared
  if (!apiBase()) {
    applySync({ lastSync: Date.now(), goats: getState().goats.map((g) => ({ ...g, weighings: g.weighings.map((w) => ({ ...w, synced: true })) })) });
    return sum;
  }

  for (const c of getState().queue ?? []) {
    const o = await requestEstimate({
      id: c.id,
      stage: c.stage,
      sideUri: c.sideUri,
      topUri: c.topUri,
      sideDistCm: c.distanceCm,
      topDistCm: c.topDistanceCm,
      sideF35Mm: c.sideF35Mm,
      topF35Mm: c.topF35Mm,
    });
    if (o.kind === 'offline') return { ...sum, offline: true };
    const goat = getState().goats.find((g) => g.id === c.goatId)?.name ?? 'A goat';
    if (o.kind === 'ok') {
      await addWeighing(c.goatId, {
        ...o.est,
        id: c.id,
        at: c.at,
        stage: c.stage,
        distanceCm: c.distanceCm,
        topDistanceCm: c.topDistanceCm,
        sideUri: c.sideUri,
        topUri: c.topUri,
        source: 'server',
        stageRangeOk: o.stageRangeOk,
      });
      dropCapture(c.id, false);
      sum.estimated++;
    } else {
      dropCapture(c.id, true);
      sum.retakes.push({ goat, reason: o.kind === 'retake' ? o.reason : o.message });
    }
  }

  for (const uid of getState().tombstones ?? []) {
    if (!(await pushRecord({ uid, deleted: true }))) return { ...sum, offline: true };
    applySync({ tombstones: getState().tombstones?.filter((t) => t !== uid) });
  }

  for (const g of getState().goats) {
    for (const w of g.weighings.filter((x) => !x.synced)) {
      // simulated and demo weighings stay on this phone; there is no real measurement to share
      if (w.source === 'server') {
        if (!(await pushRecord(toRecord(g, w)))) return { ...sum, offline: true };
        sum.pushed++;
      }
      markSynced(w.id);
    }
  }

  const recs = await pullRecords();
  if (!recs) return { ...sum, offline: true };
  // a weighing deleted while the pull was in flight must not come back
  const tomb = new Set(getState().tombstones);
  const merged = mergeRecords(
    getState().goats,
    recs.filter((r) => !tomb.has(r.uid)),
  );
  applySync({ goats: merged.goats, lastSync: Date.now() });
  return { ...sum, pulled: merged.pulled };
}

let inflight: Promise<SyncSummary> | null = null;

/** Concurrent calls share one in-flight run. */
export function syncNow(): Promise<SyncSummary> {
  inflight ??= run().finally(() => {
    inflight = null;
  });
  return inflight;
}

if (__DEV__) {
  // self-check: record round-trip, idempotent pulls, tombstones, Pi records, skipped records
  const goat: Goat = { id: 'g1', name: 'Bituin', tag: 'T-014', member: 'Ana Reyes', stage: 'adult', weighings: [] };
  const w: Weighing = { id: 'w1', at: Date.parse('2026-11-20T08:00:00Z'), weight: 27.1, bodyLength: 60, chestHeight: 30, chestWidth: 18, heartGirth: 70, stage: 'adult', distanceCm: 150, synced: true, source: 'server' };
  const rec = toRecord(goat, w);
  const a = mergeRecords([], [rec]);
  const aw = a.goats[0]?.weighings[0];
  console.assert(a.goats.length === 1 && a.goats[0].weighings.length === 1 && aw?.weight === 27.1 && aw.at === w.at && aw.id === 'w1', 'sync round-trip');
  const b = mergeRecords(a.goats, [rec]);
  console.assert(b.pulled === 0 && b.goats[0].weighings.length === 1, 'sync duplicate');
  const c = mergeRecords(a.goats, [{ uid: 'w1', deleted: true }]);
  console.assert(c.goats[0].weighings.length === 0 && c.pulled === 0, 'sync tombstone');
  const pi: CloudRecord = {
    uid: 'p1', goat_id: 'G001', stage: 'adult', ts: '2026-11-20T08:00:00+00:00', side_dist_cm: 100, top_dist_cm: 100,
    measurements: { body_length_cm: 60, chest_height_cm: 30, chest_width_cm: 18, heart_girth_cm: 70 }, weight_kg: 27.1, validated: false, retake: false,
  };
  const d = mergeRecords([{ ...goat, tag: 'G001' }], [pi]);
  console.assert(d.goats.length === 1 && d.goats[0].id === 'g1' && d.goats[0].weighings[0]?.id === 'p1', 'sync pi record by tag');
  const e = mergeRecords([], [{ ...pi, retake: true }, { ...pi, uid: 'p2', weight_kg: null as unknown as number }]);
  console.assert(e.pulled === 0 && e.goats.length === 0, 'sync skips retake and null weight');
}
