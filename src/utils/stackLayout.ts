import type { Product } from '../types';

/**
 * Real-scale stacking rules shared by the 3D renderer, the collision world and
 * the isometric fallback. Everything in metres. Stacks: length on local X,
 * depth (cols) on local Z, base at y = 0.
 */
export const STACK = {
  gap: 0.006,
  stickerEvery: 4,
  stickerT: 0.025,
  bearerH: 0.08,
};

export interface StackSpec {
  kind: 'board' | 'round' | 'bag' | 'bulk';
  length: number;
  depth: number;
  height: number;
  cols: number;
  rows: number;
  /** cross-section of one piece */
  pieceW: number;
  pieceT: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function bagSize(product: Product): { x: number; y: number; z: number; perX: number; perZ: number; layers: number } {
  const kg = product.dimensions.weightKg ?? 10;
  if (kg <= 6) return { x: 0.36, y: 0.12, z: 0.46, perX: 3, perZ: 2, layers: 6 };
  return { x: 0.55, y: 0.18, z: 0.44, perX: 2, perZ: 2, layers: 5 };
}

export const PALLET = { x: 1.2, z: 1.0, h: 0.144 };
export const BULK = { radius: 2.0, height: 1.25 };

export function stackSpec(product: Product): StackSpec {
  const d = product.dimensions;
  const L = d.lengthM ?? 2;
  switch (product.shape) {
    case 'board': {
      const w = (d.widthCm ?? 10) / 100;
      const t = (d.thicknessCm ?? 5) / 100;
      const cols = clamp(Math.round(1.1 / (w + STACK.gap)), 3, 12);
      const rows = clamp(Math.round(1.15 / (t + STACK.gap)), 4, 24);
      const stickers = Math.floor((rows - 1) / STACK.stickerEvery);
      const height = STACK.bearerH + rows * (t + STACK.gap) + stickers * STACK.stickerT;
      return { kind: 'board', length: L, depth: cols * (w + STACK.gap), height, cols, rows, pieceW: w, pieceT: t };
    }
    case 'round': {
      const dia = (d.diameterCm ?? 10) / 100;
      const cols = clamp(Math.round(1.1 / dia), 3, 14);
      const rows = Math.min(cols, Math.max(2, Math.round(1.0 / (dia * 0.866))));
      const height = STACK.bearerH + dia + (rows - 1) * dia * 0.866;
      return { kind: 'round', length: L, depth: cols * dia, height, cols, rows, pieceW: dia, pieceT: dia };
    }
    case 'bag': {
      const b = bagSize(product);
      return { kind: 'bag', length: PALLET.x, depth: PALLET.z, height: PALLET.h + b.layers * b.y, cols: b.perZ, rows: b.layers, pieceW: b.z, pieceT: b.y };
    }
    case 'bulk':
    default:
      return { kind: 'bulk', length: BULK.radius * 2, depth: BULK.radius * 2, height: BULK.height, cols: 0, rows: 0, pieceW: 0, pieceT: 0 };
  }
}

/** Cross-section of a single loose piece (used for greenhouse / trellis elements). */
export function pieceSection(product: Product): { w: number; t: number; round: boolean } {
  const d = product.dimensions;
  if (product.shape === 'round') {
    const dia = (d.diameterCm ?? 10) / 100;
    return { w: dia, t: dia, round: true };
  }
  return { w: (d.widthCm ?? 8) / 100, t: (d.thicknessCm ?? 4) / 100, round: false };
}
