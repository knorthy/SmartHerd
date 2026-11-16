import './storage';

import { useSyncExternalStore } from 'react';

import { deletePhotos, keepPhoto } from './photos';
import { SALE_WEIGHT_KG, simulateEstimate, type GrowthStage, type Measurements } from './estimate';

export const DEFAULT_SALE_KG = SALE_WEIGHT_KG;

export type Weighing = Measurements & {
  id: string;
  at: number; // epoch ms
  weight: number; // kg
  stage: GrowthStage;
  distanceCm: number;
  sideUri?: string;
  topUri?: string;
  synced: boolean;
};

export type Goat = {
  id: string;
  name: string;
  tag: string;
  member: string;
  stage: GrowthStage;
  weighings: Weighing[]; // newest last
  demo?: boolean;
};

export type Profile = { name: string; coop: string };

type State = {
  goats: Goat[];
  lastSync: number | null;
  onboarded?: boolean;
  theme?: 'system' | 'light' | 'dark';
  profile?: Profile;
  /** Weight the cooperative sells at; set in Profile. */
  saleWeight?: number;
  /** Set after the first full loading animation has played. */
  launched?: boolean;
};

const KEY = 'smartherd:v1';
const empty: State = { goats: [], lastSync: null };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : empty;
  } catch {
    return empty;
  }
}

let state = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useHerd() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const latest = (g: Goat): Weighing | undefined => g.weighings[g.weighings.length - 1];

/** 0 = at sale weight; null = not enough history to project. Linear projection from first to last weighing. */
export function daysToSale(g: Goat): number | null {
  const last = latest(g);
  if (!last) return null;
  const sale = state.saleWeight ?? DEFAULT_SALE_KG;
  if (last.weight >= sale) return 0;
  const first = g.weighings[0];
  const rate = (last.weight - first.weight) / ((last.at - first.at) / 86_400_000);
  if (g.weighings.length < 2 || !(rate > 0)) return null;
  return Math.ceil((sale - last.weight) / rate);
}

/** Ready goats first, then soonest projected, then unprojectable, then never weighed. */
export function rankForSale(goats: Goat[]) {
  const key = (g: Goat) => {
    const d = daysToSale(g);
    return d === null ? (latest(g) ? 1e6 : 2e6) : d;
  };
  // ties (e.g. every ready goat is 0 days) go heaviest first
  return [...goats].sort((a, b) => key(a) - key(b) || (latest(b)?.weight ?? 0) - (latest(a)?.weight ?? 0));
}

export function addGoat(goat: Omit<Goat, 'id' | 'weighings'>) {
  const g: Goat = { ...goat, id: newId(), weighings: [] };
  set({ ...state, goats: [...state.goats, g] });
  return g;
}

/** Saves a weighing; photos are copied into app storage first so the record keeps them. Returns its id. */
export async function addWeighing(goatId: string, w: Omit<Weighing, 'id' | 'synced' | 'at'>) {
  const id = newId();
  const [sideUri, topUri] = await Promise.all([
    w.sideUri ? keepPhoto(w.sideUri, `${id}-side`) : undefined,
    w.topUri ? keepPhoto(w.topUri, `${id}-top`) : undefined,
  ]);
  set({
    ...state,
    goats: state.goats.map((g) =>
      g.id === goatId ? { ...g, stage: w.stage, weighings: [...g.weighings, { ...w, sideUri, topUri, id, at: Date.now(), synced: false }] } : g,
    ),
  });
  return id;
}

export function tagTaken(tag: string, exceptGoatId?: string) {
  return state.goats.some((g) => g.tag === tag && g.id !== exceptGoatId);
}

export function updateGoat(goatId: string, patch: Partial<Pick<Goat, 'name' | 'tag' | 'member' | 'stage'>>) {
  set({ ...state, goats: state.goats.map((g) => (g.id === goatId ? { ...g, ...patch } : g)) });
}

/** Removes one weighing and returns what `restoreWeighing` needs to undo it. Photos are kept until the undo window closes. */
export function removeWeighing(goatId: string, weighingId: string) {
  const g = state.goats.find((x) => x.id === goatId);
  const index = g?.weighings.findIndex((w) => w.id === weighingId) ?? -1;
  if (!g || index < 0) return null;
  const weighing = g.weighings[index];
  set({ ...state, goats: state.goats.map((x) => (x.id === goatId ? { ...x, weighings: x.weighings.filter((w) => w.id !== weighingId) } : x)) });
  return { goatId, weighing, index };
}

export function restoreWeighing({ goatId, weighing, index }: { goatId: string; weighing: Weighing; index: number }) {
  set({
    ...state,
    goats: state.goats.map((g) => {
      if (g.id !== goatId) return g;
      const ws = [...g.weighings];
      ws.splice(Math.min(index, ws.length), 0, weighing);
      return { ...g, weighings: ws };
    }),
  });
}

export function deleteGoat(goatId: string) {
  deletePhotos(state.goats.find((g) => g.id === goatId)?.weighings.flatMap((w) => [w.sideUri, w.topUri]) ?? []);
  set({ ...state, goats: state.goats.filter((g) => g.id !== goatId) });
}

// shortcut: SmartHerd Sync has no backend yet; "sync" just marks local records as uploaded.
export function syncNow() {
  set({
    ...state,
    lastSync: Date.now(),
    goats: state.goats.map((g) => ({ ...g, weighings: g.weighings.map((w) => ({ ...w, synced: true })) })),
  });
}

export function unsyncedCount(s: State) {
  return s.goats.reduce((n, g) => n + g.weighings.filter((w) => !w.synced).length, 0);
}

export function resetHerd() {
  deletePhotos(state.goats.flatMap((g) => g.weighings.flatMap((w) => [w.sideUri, w.topUri])));
  set({ ...empty, onboarded: state.onboarded, theme: state.theme, profile: state.profile, saleWeight: state.saleWeight, launched: state.launched });
}

const DAY = 86_400_000;

/** Synthetic sample herd, flagged demo so the UI can label it. */
export function loadDemoHerd() {
  const members = ['Ana Reyes', 'Ben Cruz', 'Carla Dizon'];
  const seed: [string, string, GrowthStage, number][] = [
    ['Bituin', 'T-014', 'adult', 0],
    ['Dalisay', 'T-008', 'adult', 1],
    ['Mayumi', 'T-021', 'grower', 2],
    ['Ligaya', 'T-017', 'grower', 0],
    ['Kidlat', 'T-030', 'young', 1],
    ['Tala', 'T-033', 'young', 2],
  ];
  const goats: Goat[] = seed.map(([name, tag, stage, m], i) => {
    const stages: GrowthStage[] = stage === 'adult' ? ['grower', 'grower', 'adult', 'adult'] : stage === 'grower' ? ['young', 'young', 'grower', 'grower'] : ['young', 'young', 'young', 'young'];
    const weighings: Weighing[] = stages
      .map((s, k) => ({ ...simulateEstimate(s), id: newId() + k, at: Date.now() - (3 - k) * 21 * DAY - i * DAY, stage: s, distanceCm: 150, synced: k < 3 }))
      .sort((a, b) => a.weight - b.weight)
      .map((w, k, arr) => ({ ...w, at: Date.now() - (arr.length - 1 - k) * 21 * DAY - i * DAY }));
    return { id: newId() + i, name, tag, member: members[m], stage, weighings, demo: true };
  });
  set({ ...state, goats, lastSync: Date.now() - 2 * DAY });
}

/** First-run tutorial flag; set false to replay it. */
export function setOnboarded(onboarded: boolean) {
  set({ ...state, onboarded });
}

export function setTheme(theme: 'system' | 'light' | 'dark') {
  set({ ...state, theme });
}

export function setProfile(profile: Profile) {
  set({ ...state, profile });
}

export function useSaleWeight() {
  return useHerd().saleWeight ?? DEFAULT_SALE_KG;
}

export function setSaleWeight(kg: number) {
  set({ ...state, saleWeight: kg });
}

export function markLaunched() {
  if (!state.launched) set({ ...state, launched: true });
}
