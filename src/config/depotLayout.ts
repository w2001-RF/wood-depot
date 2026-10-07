import type { ZoneId } from '../types';
import type { Rect } from '../utils/geometry2d';

/**
 * THE DEPOT PLAN. One source of truth for rendering, collisions, interaction,
 * minimap, guided navigation and the isometric fallback. Units: metres.
 * Visitors enter at z = 0 and walk towards −z.
 *
 *            front yard (z 0..20) — entrance door x ±3.2
 *   ┌───────────────────────────────────────┐ z 0
 *   │ CONSTRUCTION (roofed)        [desk]   │
 *   ├──────────────────┬────────────────────┤ z −16
 *   │ AGRICULTURE      │  SERRES (open sky) │
 *   ├──────────────────┴────────────────────┤ z −32
 *   │ CHARBON          │  QUAI DE CHARGEMENT│
 *   └───────────── back door x ±4 ──────────┘ z −44
 *            back yard with truck (z −44..−60)
 */
export const WAREHOUSE = {
  minX: -15,
  maxX: 15,
  minZ: -44,
  maxZ: 0,
  wallT: 0.3,
  eave: 7,
  ridge: 9.5,
  frontDoor: { minX: -3.2, maxX: 3.2, h: 5.4 },
  backDoor: { minX: -4, maxX: 4, h: 5.4 },
  /** open-sky section between the two roofed halls */
  courtyard: { minZ: -32, maxZ: -16 },
  frames: [0, -4, -8, -12, -16, -32, -36, -40, -44],
};

export const SITE = { minX: -20, maxX: 20, minZ: -60, maxZ: 20 };

export const PLAYER = {
  eye: 1.65,
  radius: 0.32,
  walk: 3.0,
  run: 5.4,
  start: { x: 0, z: -1.2, yaw: 0, pitch: -0.04 },
  /** distance (to the footprint edge) under which a product is "nearby" */
  nearDist: 2.6,
  /** max click distance */
  clickDist: 16,
};

export interface ZoneDef {
  id: ZoneId;
  rect: Rect;
  /** where guidance leads you when you pick the zone on the map */
  anchor: { x: number; z: number };
  code: string;
  color: string;
  onMap: boolean;
}

export const ZONES: ZoneDef[] = [
  { id: 'construction', rect: { minX: -15, maxX: 15, minZ: -16, maxZ: 0 }, anchor: { x: 0, z: -8 }, code: 'A', color: '#b07a45', onMap: true },
  { id: 'agriculture', rect: { minX: -15, maxX: 0, minZ: -32, maxZ: -16 }, anchor: { x: -1.5, z: -23 }, code: 'B', color: '#6f8b4a', onMap: true },
  { id: 'greenhouse', rect: { minX: 0, maxX: 15, minZ: -32, maxZ: -16 }, anchor: { x: 6.6, z: -22 }, code: 'C', color: '#4f8a76', onMap: true },
  { id: 'charcoal', rect: { minX: -15, maxX: -4, minZ: -44, maxZ: -32 }, anchor: { x: -3.6, z: -38 }, code: 'D', color: '#4a4440', onMap: true },
  { id: 'loading', rect: { minX: -4, maxX: 15, minZ: -44, maxZ: -32 }, anchor: { x: 2.5, z: -38 }, code: 'E', color: '#8a7a62', onMap: true },
  { id: 'desk', rect: { minX: 10.2, maxX: 14.85, minZ: -5, maxZ: -1 }, anchor: { x: 8.8, z: -3 }, code: '€', color: '#c9a227', onMap: true },
  { id: 'entrance', rect: { minX: -20, maxX: 20, minZ: 0, maxZ: 20 }, anchor: { x: 0, z: 4 }, code: '↓', color: '#9c8b70', onMap: false },
  { id: 'yard', rect: { minX: -16, maxX: 16, minZ: -60, maxZ: -44 }, anchor: { x: -4, z: -50 }, code: 'F', color: '#9c8b70', onMap: false },
];

export interface PlacementDef {
  id: string;
  productId: string;
  zone: ZoneId;
  x: number;
  z: number;
  /** 0 = length along X, π/2 = length along Z */
  rotY: number;
  /** standing point used by guided navigation */
  access: { x: number; z: number };
}

const H = Math.PI / 2;

export const PLACEMENTS: PlacementDef[] = [
  // Construction — left racks (length across the hall)
  { id: 'pl-madrier', productId: 'madrier', zone: 'construction', x: -9, z: -3.5, rotY: 0, access: { x: -5.6, z: -1.7 } },
  { id: 'pl-planche', productId: 'planche', zone: 'construction', x: -9, z: -7.5, rotY: 0, access: { x: -5.6, z: -5.6 } },
  { id: 'pl-chevron', productId: 'chevron', zone: 'construction', x: -9, z: -11, rotY: 0, access: { x: -5.6, z: -9.25 } },
  { id: 'pl-bastaing', productId: 'bastaing', zone: 'construction', x: -9, z: -14.5, rotY: 0, access: { x: -5.6, z: -12.8 } },
  // Construction — right racks
  { id: 'pl-poutre', productId: 'poutre', zone: 'construction', x: 9, z: -7.5, rotY: 0, access: { x: 5.2, z: -6.0 } },
  { id: 'pl-charpente', productId: 'bois-charpente', zone: 'construction', x: 9, z: -11, rotY: 0, access: { x: 5.2, z: -9.3 } },
  { id: 'pl-coffrage', productId: 'bois-coffrage', zone: 'construction', x: 9, z: -14.5, rotY: 0, access: { x: 5.2, z: -12.8 } },
  // Agriculture (courtyard, length along Z)
  { id: 'pl-poteau-agri', productId: 'poteau-agricole', zone: 'agriculture', x: -3.8, z: -20.5, rotY: H, access: { x: -2.3, z: -20.5 } },
  { id: 'pl-perche', productId: 'perche-bois', zone: 'agriculture', x: -6.6, z: -20.5, rotY: H, access: { x: -5.25, z: -22.6 } },
  { id: 'pl-traverse-agri', productId: 'traverse-agricole', zone: 'agriculture', x: -3.8, z: -27.5, rotY: H, access: { x: -2.3, z: -27.5 } },
  { id: 'pl-support-agri', productId: 'support-agricole', zone: 'agriculture', x: -6.6, z: -27.5, rotY: H, access: { x: -5.25, z: -25 } },
  { id: 'pl-structure-agri', productId: 'bois-structure-agricole', zone: 'agriculture', x: -11.5, z: -18.2, rotY: 0, access: { x: -11.5, z: -16.4 } },
  // Greenhouse supplies
  { id: 'pl-poteau-serre', productId: 'poteau-serre', zone: 'greenhouse', x: 4.2, z: -19, rotY: H, access: { x: 5.7, z: -19 } },
  { id: 'pl-support-serre', productId: 'support-serre', zone: 'greenhouse', x: 4.2, z: -23.5, rotY: H, access: { x: 5.7, z: -23.5 } },
  { id: 'pl-structure-serre', productId: 'piece-structure-serre', zone: 'greenhouse', x: 4.2, z: -28, rotY: H, access: { x: 5.7, z: -28 } },
  { id: 'pl-traverse-serre', productId: 'traverse-serre', zone: 'greenhouse', x: 9.8, z: -29.6, rotY: 0, access: { x: 9.8, z: -31.3 } },
  { id: 'pl-renfort-serre', productId: 'renfort-serre', zone: 'greenhouse', x: 13.8, z: -30.8, rotY: 0, access: { x: 13.6, z: -32.4 } },
  // Charcoal
  { id: 'pl-charbon-vrac', productId: 'charbon-vrac', zone: 'charcoal', x: -11.5, z: -39.5, rotY: 0, access: { x: -8.1, z: -40.6 } },
  { id: 'pl-sac-5', productId: 'sac-charbon-5', zone: 'charcoal', x: -6.2, z: -35.2, rotY: 0, access: { x: -4.4, z: -35.2 } },
  { id: 'pl-sac-15', productId: 'sac-charbon-15', zone: 'charcoal', x: -6.2, z: -38.4, rotY: 0, access: { x: -4.4, z: -38.4 } },
  // Outdoor stock in the front yard
  { id: 'pl-ext-charpente', productId: 'bois-charpente', zone: 'entrance', x: -11, z: 8, rotY: 0, access: { x: -11, z: 10.2 } },
  { id: 'pl-ext-poteau', productId: 'poteau-agricole', zone: 'entrance', x: 11, z: 8, rotY: 0, access: { x: 11, z: 10.2 } },
];

/** Element defined by its two end points (axis = piece length). */
export interface ElementDef {
  id: string;
  productId: string;
  zone: ZoneId;
  from: [number, number, number];
  to: [number, number, number];
}

export const GREENHOUSE = { minX: 8.5, maxX: 13.5, minZ: -26, maxZ: -18, eave: 2.4, ridge: 3.4, door: { z: -22, w: 1.4 } };

/** The demo greenhouse is literally built from the products sold in the greenhouse zone. */
export function greenhouseElements(): ElementDef[] {
  const g = GREENHOUSE;
  const cx = (g.minX + g.maxX) / 2;
  const frames = [-18, -20.667, -23.333, -26];
  const els: ElementDef[] = [];
  frames.forEach((z, i) => {
    els.push({ id: `gh-post-w${i}`, productId: 'poteau-serre', zone: 'greenhouse', from: [g.minX, 0, z], to: [g.minX, g.eave, z] });
    els.push({ id: `gh-post-e${i}`, productId: 'poteau-serre', zone: 'greenhouse', from: [g.maxX, 0, z], to: [g.maxX, g.eave, z] });
    els.push({ id: `gh-raft-w${i}`, productId: 'piece-structure-serre', zone: 'greenhouse', from: [g.minX, g.eave, z], to: [cx, g.ridge, z] });
    els.push({ id: `gh-raft-e${i}`, productId: 'piece-structure-serre', zone: 'greenhouse', from: [g.maxX, g.eave, z], to: [cx, g.ridge, z] });
  });
  // ridge supports at the gable ends
  els.push({ id: 'gh-sup-n', productId: 'support-serre', zone: 'greenhouse', from: [cx, 0, -18], to: [cx, g.ridge, -18] });
  els.push({ id: 'gh-sup-s', productId: 'support-serre', zone: 'greenhouse', from: [cx, 0, -26], to: [cx, g.ridge, -26] });
  // longitudinal members
  els.push({ id: 'gh-trav-w', productId: 'traverse-serre', zone: 'greenhouse', from: [g.minX, g.eave, -18], to: [g.minX, g.eave, -26] });
  els.push({ id: 'gh-trav-e', productId: 'traverse-serre', zone: 'greenhouse', from: [g.maxX, g.eave, -18], to: [g.maxX, g.eave, -26] });
  els.push({ id: 'gh-trav-r', productId: 'traverse-serre', zone: 'greenhouse', from: [cx, g.ridge, -18], to: [cx, g.ridge, -26] });
  // knee braces at the four corners
  els.push({ id: 'gh-ren-nw', productId: 'renfort-serre', zone: 'greenhouse', from: [g.minX, 1.5, -18], to: [g.minX, g.eave, -18.9] });
  els.push({ id: 'gh-ren-ne', productId: 'renfort-serre', zone: 'greenhouse', from: [g.maxX, 1.5, -18], to: [g.maxX, g.eave, -18.9] });
  els.push({ id: 'gh-ren-sw', productId: 'renfort-serre', zone: 'greenhouse', from: [g.minX, 1.5, -26], to: [g.minX, g.eave, -25.1] });
  els.push({ id: 'gh-ren-se', productId: 'renfort-serre', zone: 'greenhouse', from: [g.maxX, 1.5, -26], to: [g.maxX, g.eave, -25.1] });
  return els;
}

export const TRELLIS = { rowsX: [-12.8, -9.8], postsZ: [-21.5, -24.5, -27.5, -30.5], postH: 2.0, barY: 1.85 };

/** A T-trellis orchard row showing agricultural posts and crossbars in use. */
export function trellisElements(): ElementDef[] {
  const els: ElementDef[] = [];
  TRELLIS.rowsX.forEach((x, r) =>
    TRELLIS.postsZ.forEach((z, i) => {
      els.push({ id: `tr-post-${r}-${i}`, productId: 'poteau-agricole', zone: 'agriculture', from: [x, 0, z], to: [x, TRELLIS.postH, z] });
      els.push({ id: `tr-bar-${r}-${i}`, productId: 'traverse-agricole', zone: 'agriculture', from: [x - 0.6, TRELLIS.barY, z], to: [x + 0.6, TRELLIS.barY, z] });
    }),
  );
  return els;
}

export interface PropDef {
  id: string;
  kind: 'pallets' | 'forklift' | 'truck' | 'desk';
  x: number;
  z: number;
  rotY: number;
  /** pallet stack height (count) */
  count?: number;
}

export const PROPS: PropDef[] = [
  { id: 'desk', kind: 'desk', x: 12.5, z: -3, rotY: 0 },
  { id: 'forklift', kind: 'forklift', x: 8.5, z: -38.5, rotY: 0 },
  { id: 'truck', kind: 'truck', x: 0, z: -52, rotY: 0 },
  { id: 'pal-1', kind: 'pallets', x: 5.6, z: -2.4, rotY: 0, count: 7 },
  { id: 'pal-2', kind: 'pallets', x: 5.4, z: -34.6, rotY: 0, count: 9 },
  { id: 'pal-3', kind: 'pallets', x: 6.9, z: -34.6, rotY: 0, count: 5 },
  { id: 'pal-4', kind: 'pallets', x: 12.8, z: -41.8, rotY: H, count: 8 },
  { id: 'pal-5', kind: 'pallets', x: 13.6, z: -35.5, rotY: H, count: 3 },
  { id: 'pal-6', kind: 'pallets', x: -6, z: 12, rotY: 0.3, count: 4 },
  { id: 'pal-7', kind: 'pallets', x: 7, z: 13, rotY: -0.2, count: 6 },
  { id: 'pal-8', kind: 'pallets', x: -9, z: -49, rotY: 0.1, count: 6 },
  { id: 'pal-9', kind: 'pallets', x: 9, z: -50, rotY: 0, count: 4 },
];

export const PROP_FOOTPRINT: Record<PropDef['kind'], { length: number; depth: number; height: number }> = {
  pallets: { length: 1.2, depth: 1.0, height: 0.144 },
  forklift: { length: 1.2, depth: 2.9, height: 2.3 },
  truck: { length: 2.5, depth: 11.2, height: 3.2 },
  desk: { length: 4.6, depth: 4.0, height: 3.0 },
};

/**
 * Cantilever racks along the hall walls: the tall stock that makes a timber
 * yard read as one. Timber lies along the wall (length on Z). Each segment is
 * loaded with the product sold in the pile in front of it.
 */
export interface RackDef {
  id: string;
  /** x of the column line (against the wall) */
  x: number;
  /** arms point toward +x (1) or −x (−1) */
  dir: 1 | -1;
  z0: number;
  z1: number;
  productId: string;
}
export const RACK = { reach: 1.15, levels: [0.35, 1.3, 2.25, 3.2], bay: 1.6, height: 3.9 };
export const RACKS: RackDef[] = [
  { id: 'rk-l1', x: -14.55, dir: 1, z0: -1, z1: -5.6, productId: 'madrier' },
  { id: 'rk-l2', x: -14.55, dir: 1, z0: -5.6, z1: -10.2, productId: 'planche' },
  { id: 'rk-l3', x: -14.55, dir: 1, z0: -10.2, z1: -15, productId: 'chevron' },
  { id: 'rk-r1', x: 14.55, dir: -1, z0: -6.2, z1: -10.6, productId: 'poutre' },
  { id: 'rk-r2', x: 14.55, dir: -1, z0: -10.6, z1: -15, productId: 'bois-coffrage' },
];

/** Waypoints for guided navigation; edges are generated where the walk is collision-free. */
export const NAV_NODES: { x: number; z: number }[] = [
  { x: 0, z: 12 }, { x: 0, z: 5 }, { x: -6, z: 6 }, { x: 6, z: 6 },
  { x: 0, z: 0 }, { x: 0, z: -2 },
  { x: 0, z: -5.6 }, { x: 0, z: -9.25 }, { x: 0, z: -12.8 }, { x: 0, z: -16.3 },
  { x: 0, z: -20 }, { x: 0, z: -24 }, { x: 0, z: -28 }, { x: 0, z: -31.5 },
  { x: 0, z: -35 }, { x: 0, z: -38.5 }, { x: 0, z: -42 }, { x: 0, z: -44 },
  { x: -5.6, z: -1.7 }, { x: -5.6, z: -5.6 }, { x: -5.6, z: -9.25 }, { x: -5.6, z: -12.8 },
  { x: -5.2, z: -16.2 }, { x: -11.5, z: -16.3 },
  { x: 5.2, z: -6.0 }, { x: 5.2, z: -9.3 }, { x: 5.2, z: -12.8 }, { x: 5.2, z: -16.2 }, { x: 8.8, z: -3 },
  { x: -5.25, z: -24 }, { x: -8.3, z: -24 }, { x: -11.3, z: -24 }, { x: -8.3, z: -31.3 },
  { x: 6.6, z: -22 }, { x: 9.1, z: -22 }, { x: 6.6, z: -31.3 }, { x: 11, z: -31.3 }, { x: 13.4, z: -33 },
  { x: -4.2, z: -36.8 }, { x: -8.1, z: -36 }, { x: 3.5, z: -36.5 },
  { x: -3, z: -46 }, { x: 3, z: -46 }, { x: -4, z: -50 }, { x: 4, z: -50 },
];
