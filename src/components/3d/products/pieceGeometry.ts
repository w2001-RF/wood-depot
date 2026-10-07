import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import type { Product } from '../../../types';
import type { DepotMaterials } from '../materials/materials';

const geoCache = new Map<string, THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

/**
 * Board with length on X. UVs are rewritten in metres (1 texture tile ≈ 1.1 m)
 * so grain and knots keep real proportions on every board size.
 * Two material groups only — [end grain, sawn faces] — so each pile costs 2
 * draw calls instead of 6 (BoxGeometry's default is one group per face).
 */
export function boardGeometry(length: number, width: number, thickness: number): THREE.BoxGeometry {
  return cached(`b:${length}:${width}:${thickness}`, () => {
    const g = new THREE.BoxGeometry(length, thickness, width);
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const T = 1.1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const nx = Math.abs(nor.getX(i));
      const ny = Math.abs(nor.getY(i));
      if (nx > 0.5) {
        uv.setXY(i, z / width + 0.5, y / thickness + 0.5); // end grain fills the end face
      } else if (ny > 0.5) {
        uv.setXY(i, x / T, z / T + 0.31);
      } else {
        uv.setXY(i, x / T, y / T + 0.67);
      }
    }
    uv.needsUpdate = true;
    // BoxGeometry index order is +x, −x, +y, −y, +z, −z (6 indices each, 1 segment)
    g.clearGroups();
    g.addGroup(0, 12, 0);
    g.addGroup(12, 24, 1);
    return g;
  });
}

/** Round pole with length on X. Groups: [side, cap, cap]. */
export function poleGeometry(length: number, diameter: number, segments: number): THREE.CylinderGeometry {
  return cached(`p:${length}:${diameter}:${segments}`, () => {
    const r = diameter / 2;
    const g = new THREE.CylinderGeometry(r * 0.96, r, length, segments, 1);
    const uv = g.attributes.uv;
    // side: v along length — tile every ~1.5 m
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (length / 1.5));
    uv.needsUpdate = true;
    // merge the two caps into one group: [bark side, end grain]
    const side = g.groups[0];
    const total = g.index!.count;
    g.clearGroups();
    g.addGroup(0, side.count, 0);
    g.addGroup(side.count, total - side.count, 1);
    g.rotateZ(Math.PI / 2);
    return g;
  });
}

export function bagGeometry(x: number, y: number, z: number): THREE.BufferGeometry {
  return cached(`bag:${x}:${y}:${z}`, () => {
    const g = new RoundedBoxGeometry(x, y, z, 3, Math.min(y, x) * 0.42);
    // slight sag so sacks look filled with loose charcoal
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      const py = pos.getY(i);
      if (py > 0) pos.setY(i, py * (1 - 0.25 * ((px / x) ** 2 + (pz / z) ** 2)));
    }
    g.computeVertexNormals();
    return g;
  });
}

export function pileGeometry(radius: number, height: number): THREE.BufferGeometry {
  return cached(`pile:${radius}:${height}`, () => {
    const g = new THREE.IcosahedronGeometry(1, 5);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const n = Math.sin(x * 9.1 + z * 7.3) * 0.05 + Math.sin(x * 23 - z * 19) * 0.025 + Math.cos(y * 31 + x * 17) * 0.02;
      if (y < 0) y = 0;
      const k = 1 + n;
      x *= radius * k;
      z *= radius * k;
      y = Math.pow(y, 1.4) * height * (1 + n * 0.6);
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  });
}

export function lumpGeometry(): THREE.BufferGeometry {
  return cached('lump', () => new THREE.DodecahedronGeometry(1, 0));
}

export function unitBox(): THREE.BoxGeometry {
  return cached('unit', () => new THREE.BoxGeometry(1, 1, 1)) as THREE.BoxGeometry;
}

const matArrays = new WeakMap<DepotMaterials, Map<string, THREE.Material[]>>();

/**
 * Materials for one board / pole piece (variant 0/1 alternates grain).
 * Returns the SAME array for the same inputs: R3F rebuilds an object whenever
 * its constructor args change identity, which would wipe instance matrices.
 */
export function pieceMaterials(product: Product, mats: DepotMaterials, variant = 0): THREE.Material[] {
  let byKey = matArrays.get(mats);
  if (!byKey) {
    byKey = new Map();
    matArrays.set(mats, byKey);
  }
  const tone = product.woodTone;
  const key = `${product.shape === 'round' ? 'r' : 'b'}:${tone}:${variant % 2}`;
  let arr = byKey.get(key);
  if (!arr) {
    const end = mats.woodEnd[tone];
    arr = product.shape === 'round' ? [mats.pole[tone], end] : [end, mats.woodSide[tone][variant % 2]];
    byKey.set(key, arr);
  }
  return arr;
}
