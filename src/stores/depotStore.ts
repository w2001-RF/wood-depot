import { create } from 'zustand';
import type { QualityLevel, ZoneId } from '../types';
import { detectQuality } from '../utils/webgl';

export type DepotPhase = 'idle' | 'loading' | 'cinematic' | 'explore';
export type InteractionState = 'idle' | 'nearby' | 'hover' | 'selected' | 'inspecting' | 'added' | 'guided';

export interface GuideTarget {
  /** placement / element id, or `zone:<id>` */
  id: string;
  label: string;
  point: { x: number; z: number };
  productPlacementId?: string;
}

interface DepotState {
  phase: DepotPhase;
  progress: number;
  quality: QualityLevel;
  viewMode: '3d' | 'plan';
  notice: string | null;
  hoveredId: string | null;
  focusedId: string | null;
  selectedId: string | null;
  inspectingId: string | null;
  added: { id: string; qty: number; at: number } | null;
  guide: GuideTarget | null;
  currentZone: ZoneId;
  setPhase: (p: DepotPhase) => void;
  setProgress: (p: number) => void;
  setQuality: (q: QualityLevel) => void;
  setViewMode: (m: '3d' | 'plan', notice?: string | null) => void;
  setNotice: (n: string | null) => void;
  setHovered: (id: string | null) => void;
  setFocused: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setInspecting: (id: string | null) => void;
  flashAdded: (id: string, qty: number) => void;
  setGuide: (g: GuideTarget | null) => void;
  setCurrentZone: (z: ZoneId) => void;
}

export const useDepotStore = create<DepotState>()((set) => ({
  phase: 'idle',
  progress: 0,
  quality: detectQuality(),
  viewMode: '3d',
  notice: null,
  hoveredId: null,
  focusedId: null,
  selectedId: null,
  inspectingId: null,
  added: null,
  guide: null,
  currentZone: 'entrance',
  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setQuality: (quality) => set({ quality }),
  setViewMode: (viewMode, notice = null) => set({ viewMode, notice }),
  setNotice: (notice) => set({ notice }),
  setHovered: (hoveredId) => set((s) => (s.hoveredId === hoveredId ? s : { hoveredId })),
  setFocused: (focusedId) => set((s) => (s.focusedId === focusedId ? s : { focusedId })),
  setSelected: (selectedId) => set({ selectedId }),
  setInspecting: (inspectingId) => set({ inspectingId, selectedId: null }),
  flashAdded: (id, qty) => {
    const at = performance.now();
    set({ added: { id, qty, at } });
    window.setTimeout(() => {
      if (useDepotStore.getState().added?.at === at) useDepotStore.setState({ added: null });
    }, 1800);
  },
  setGuide: (guide) => set({ guide }),
  setCurrentZone: (currentZone) => set((s) => (s.currentZone === currentZone ? s : { currentZone })),
}));

/** Priority order matches the visual hierarchy: feedback first, then intent, then proximity. */
export function interactionStateOf(s: DepotState, id: string): InteractionState {
  if (s.added?.id === id) return 'added';
  if (s.inspectingId === id) return 'inspecting';
  if (s.selectedId === id) return 'selected';
  if (s.hoveredId === id) return 'hover';
  if (s.focusedId === id) return 'nearby';
  if (s.guide && (s.guide.id === id || s.guide.productPlacementId === id)) return 'guided';
  return 'idle';
}
