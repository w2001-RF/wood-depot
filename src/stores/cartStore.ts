import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem } from '../types';
import { safeSession } from '../utils/safeStorage';

export const MAX_QTY = 9999;

interface CartState {
  items: CartItem[];
  add: (productId: string, quantity: number) => void;
  addMany: (lines: CartItem[]) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const clampQty = (q: number) => Math.max(0, Math.min(MAX_QTY, Math.round(q)));

/** Cart persists for the SPA session (sessionStorage, memory fallback). */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (productId, quantity) =>
        set((s) => {
          const q = clampQty(quantity);
          if (q <= 0) return s;
          const existing = s.items.find((i) => i.productId === productId);
          if (existing)
            return { items: s.items.map((i) => (i.productId === productId ? { ...i, quantity: clampQty(i.quantity + q) } : i)) };
          return { items: [...s.items, { productId, quantity: q }] };
        }),
      addMany: (lines) =>
        set((s) => {
          const items = [...s.items];
          for (const l of lines) {
            const q = clampQty(l.quantity);
            if (q <= 0) continue;
            const idx = items.findIndex((i) => i.productId === l.productId);
            if (idx >= 0) items[idx] = { ...items[idx], quantity: clampQty(items[idx].quantity + q) };
            else items.push({ productId: l.productId, quantity: q });
          }
          return { items };
        }),
      setQuantity: (productId, quantity) =>
        set((s) => {
          const q = clampQty(quantity);
          if (q <= 0) return { items: s.items.filter((i) => i.productId !== productId) };
          return { items: s.items.map((i) => (i.productId === productId ? { ...i, quantity: q } : i)) };
        }),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'wd-cart', storage: safeSession ? createJSONStorage(() => safeSession!) : undefined },
  ),
);

export const selectTotalItems = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectLineCount = (s: CartState) => s.items.length;
export const selectQtyOf = (productId: string) => (s: CartState) =>
  s.items.find((i) => i.productId === productId)?.quantity ?? 0;
