export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Collider extends Rect {
  minY: number;
  maxY: number;
  /** blocks line of sight for clicks / interaction */
  occludes: boolean;
  id: string;
}

export const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });

export function inflate(r: Rect, d: number): Rect {
  return { minX: r.minX - d, maxX: r.maxX + d, minZ: r.minZ - d, maxZ: r.maxZ + d };
}

export function rectContains(r: Rect, x: number, z: number): boolean {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
}

export function distanceToRect(x: number, z: number, r: Rect): number {
  const dx = Math.max(r.minX - x, 0, x - r.maxX);
  const dz = Math.max(r.minZ - z, 0, z - r.maxZ);
  return Math.hypot(dx, dz);
}

export function circleIntersectsRect(x: number, z: number, radius: number, r: Rect): boolean {
  return distanceToRect(x, z, r) < radius;
}

/** Slab test: does segment A→B cross rectangle r? */
export function segmentIntersectsRect(ax: number, az: number, bx: number, bz: number, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, ax - r.minX) && clip(dx, r.maxX - ax) && clip(-dz, az - r.minZ) && clip(dz, r.maxZ - az) && t0 <= t1;
}

/** Axis-aligned footprint of a rectangle (length on local X, depth on local Z) rotated around Y. */
export function rotatedFootprint(cx: number, cz: number, length: number, depth: number, rotY: number): Rect {
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  const hx = (length * c + depth * s) / 2;
  const hz = (length * s + depth * c) / 2;
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
}

/**
 * Moves a circle through the world, resolving collisions per axis so the
 * player slides along walls instead of sticking. Sub-steps prevent tunnelling.
 */
export function moveWithCollisions(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  colliders: Rect[],
): { x: number; z: number; hit: boolean } {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * 0.5)));
  const sx = dx / steps;
  const sz = dz / steps;
  let hit = false;
  const blocked = (px: number, pz: number) => {
    for (const c of colliders) if (circleIntersectsRect(px, pz, radius, c)) return true;
    return false;
  };
  for (let i = 0; i < steps; i++) {
    const nx = x + sx;
    if (!blocked(nx, z)) x = nx;
    else hit = true;
    const nz = z + sz;
    if (!blocked(x, nz)) z = nz;
    else hit = true;
  }
  return { x, z, hit };
}
