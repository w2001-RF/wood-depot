import type { StateStorage } from 'zustand/middleware';

/** Browser storage that never throws (sandboxed iframes, private mode). Falls back to memory. */
function make(kind: 'local' | 'session'): StateStorage {
  const memory = new Map<string, string>();
  let real: Storage | null = null;
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    s.setItem('__wd_test', '1');
    s.removeItem('__wd_test');
    real = s;
  } catch {
    real = null;
  }
  return {
    getItem: (k) => {
      try {
        return real ? real.getItem(k) : memory.get(k) ?? null;
      } catch {
        return memory.get(k) ?? null;
      }
    },
    setItem: (k, v) => {
      try {
        if (real) real.setItem(k, v);
        else memory.set(k, v);
      } catch {
        memory.set(k, v);
      }
    },
    removeItem: (k) => {
      try {
        real?.removeItem(k);
      } catch {
        /* ignore */
      }
      memory.delete(k);
    },
  };
}

export const safeSession = typeof window !== 'undefined' ? make('session') : undefined;
export const safeLocal = typeof window !== 'undefined' ? make('local') : undefined;
