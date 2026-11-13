import type { GrowthStage } from './estimate';

export const kg = (n: number) => n.toFixed(1);
export const cm = (n: number) => n.toFixed(1);

export const stageLabel = (s: GrowthStage) => s[0].toUpperCase() + s.slice(1);

export function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function ago(ms: number) {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function time(ms: number) {
  return new Date(ms).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}
