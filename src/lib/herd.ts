import './storage';

import { useSyncExternalStore } from 'react';

import { SALE_WEIGHT_KG, simulateEstimate, type GrowthStage, type Measurements } from './estimate';

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

type State = { goats: Goat[]; lastSync: number | null; onboarded?: boolean };

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
  if (last.weight >= SALE_WEIGHT_KG) return 0;
  const first = g.weighings[0];
  const rate = (last.weight - first.weight) / ((last.at - first.at) / 86_400_000);
  if (g.weighings.length < 2 || !(rate > 0)) return null;
  return Math.ceil((SALE_WEIGHT_KG - last.weight) / rate);
}

/** Ready goats first, then soonest projected, then unprojectable, then never weighed. */
export function rankForSale(goats: Goat[]) {
  const key = (g: Goat) => {
    const d = daysToSale(g);
    return d === null ? (latest(g) ? 1e6 : 2e6) : d;
  };
  return [...goats].sort((a, b) => key(a) - key(b));
}

export function addGoat(goat: Omit<Goat, 'id' | 'weighings'>) {
  const g: Goat = { ...goat, id: newId(), weighings: [] };
  set({ ...state, goats: [...state.goats, g] });
  return g;
}

export function addWeighing(goatId: string, w: Omit<Weighing, 'id' | 'synced' | 'at'>) {
  set({
    ...state,
    goats: state.goats.map((g) =>
      g.id === goatId
        ? { ...g, stage: w.stage, weighings: [...g.weighings, { ...w, id: newId(), at: Date.now(), synced: false }] }
        : g,
    ),
  });
}

export function deleteGoat(goatId: string) {
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
  set({ ...empty, onboarded: state.onboarded });
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
  set({ goats, lastSync: Date.now() - 2 * DAY, onboarded: true });
}

/** First-run tutorial flag; set false to replay it. */
export function setOnboarded(onboarded: boolean) {
  set({ ...state, onboarded });
}
