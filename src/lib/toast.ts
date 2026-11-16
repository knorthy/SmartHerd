import { useSyncExternalStore } from 'react';

export type Toast = {
  id: number;
  message: string;
  action?: { label: string; onPress: () => void };
  /** Runs when the toast leaves without its action being used (timeout or replaced). */
  onExpire?: () => void;
};

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function close(expired: boolean) {
  clearTimeout(timer);
  const t = current;
  current = null;
  emit();
  if (expired) t?.onExpire?.();
}

/** One snackbar at a time; a new one retires the old (running its onExpire). */
export function showToast(t: Omit<Toast, 'id'>) {
  if (current) close(true);
  current = { ...t, id: ++seq };
  emit();
  timer = setTimeout(() => close(true), t.action ? 8000 : 3500);
}

export function runToastAction() {
  const a = current?.action;
  close(false);
  a?.onPress();
}

export const dismissToast = () => close(true);

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
