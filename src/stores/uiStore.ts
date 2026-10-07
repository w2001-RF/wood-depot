import { create } from 'zustand';
import type { Lang, Route } from '../types';
import { safeLocal } from '../utils/safeStorage';

const ROUTE_TO_HASH: Record<Route, string> = {
  home: '',
  depot: 'depot',
  catalog: 'catalogue',
  solutions: 'solutions',
  configurator: 'configurateur',
  about: 'a-propos',
  contact: 'contact',
};
const HASH_TO_ROUTE = Object.fromEntries(Object.entries(ROUTE_TO_HASH).map(([r, h]) => [h, r])) as Record<string, Route>;

export function routeFromHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '').split('?')[0];
  return HASH_TO_ROUTE[h] ?? 'home';
}
export const hashFor = (r: Route) => `#/${ROUTE_TO_HASH[r]}`;

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'info' | 'warning';
}

export interface Inspection {
  productId: string;
  /** placement in the 3D depot this inspection originates from */
  placementId?: string;
}

interface UiState {
  route: Route;
  lang: Lang;
  cartOpen: boolean;
  quoteOpen: boolean;
  mobileMenuOpen: boolean;
  inspection: Inspection | null;
  toasts: Toast[];
  /** set when the user asked to be guided to a product before the depot was open */
  pendingGuideProductId: string | null;
  /** play the cinematic entrance on next depot mount */
  pendingIntro: boolean;
  navigate: (r: Route, opts?: { intro?: boolean; guideProductId?: string }) => void;
  setRouteFromHash: () => void;
  setLang: (l: Lang) => void;
  setCartOpen: (v: boolean) => void;
  setQuoteOpen: (v: boolean) => void;
  setMobileMenuOpen: (v: boolean) => void;
  inspect: (i: Inspection | null) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  consumeGuide: () => string | null;
  consumeIntro: () => boolean;
}

const initialLang = ((): Lang => {
  const v = safeLocal?.getItem('wd-lang');
  return v === 'ar' ? 'ar' : 'fr';
})();

let toastSeq = 1;

export const useUiStore = create<UiState>()((set, get) => ({
  route: typeof window !== 'undefined' ? routeFromHash(window.location.hash) : 'home',
  lang: initialLang,
  cartOpen: false,
  quoteOpen: false,
  mobileMenuOpen: false,
  inspection: null,
  toasts: [],
  pendingGuideProductId: null,
  pendingIntro: false,
  navigate: (r, opts) => {
    set({
      pendingIntro: !!opts?.intro,
      pendingGuideProductId: opts?.guideProductId ?? null,
      mobileMenuOpen: false,
      cartOpen: false,
    });
    const target = hashFor(r);
    if (window.location.hash !== target) window.location.hash = target;
    set({ route: r });
    if (r !== 'depot') window.scrollTo({ top: 0 });
  },
  setRouteFromHash: () => set({ route: routeFromHash(window.location.hash) }),
  setLang: (l) => {
    safeLocal?.setItem('wd-lang', l);
    set({ lang: l });
  },
  setCartOpen: (v) => set({ cartOpen: v }),
  setQuoteOpen: (v) => set({ quoteOpen: v, cartOpen: v ? false : get().cartOpen }),
  setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),
  inspect: (i) => set({ inspection: i }),
  toast: (text, tone = 'success') => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    window.setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  consumeGuide: () => {
    const g = get().pendingGuideProductId;
    if (g) set({ pendingGuideProductId: null });
    return g;
  },
  consumeIntro: () => {
    const v = get().pendingIntro;
    if (v) set({ pendingIntro: false });
    return v;
  },
}));

/** true when any overlay that should freeze 3D movement is open */
export const selectOverlayOpen = (s: UiState) => s.cartOpen || s.quoteOpen || !!s.inspection || s.mobileMenuOpen;
