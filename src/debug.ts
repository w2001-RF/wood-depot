import { playerRuntime, setPose } from './components/3d/runtime';
import { useCartStore } from './stores/cartStore';
import { useDepotStore } from './stores/depotStore';
import { useUiStore } from './stores/uiStore';

/** Test/QA hook — only installed when the URL contains ?debug. */
export function installDebugHook() {
  if (typeof window === 'undefined' || !window.location.search.includes('debug')) return;
  (window as unknown as Record<string, unknown>).__wd = { runtime: playerRuntime, setPose, depot: useDepotStore, ui: useUiStore, cart: useCartStore };
}
