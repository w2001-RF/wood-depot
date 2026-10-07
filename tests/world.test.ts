import { describe, expect, it } from 'vitest';
import { PLACEMENTS, PLAYER, ZONES } from '../src/config/depotLayout';
import { products } from '../src/data/products';
import { buildDepotWorld, findPath, zoneAt } from '../src/utils/depotWorld';
import { circleIntersectsRect, moveWithCollisions } from '../src/utils/geometry2d';

const byId = Object.fromEntries(products.map((p) => [p.id, p]));
const world = buildDepotWorld(byId);
const start = PLAYER.start;
const solid = world.colliders.filter((c) => c.maxY > 0.25);
const blocked = (x: number, z: number) => solid.some((c) => circleIntersectsRect(x, z, PLAYER.radius, c));

describe('depot layout', () => {
  it('places every catalogue product physically in the depot', () => {
    const placed = new Set(world.interactables.map((i) => i.productId));
    for (const p of products) expect(placed.has(p.id), p.id).toBe(true);
  });

  it('spawns the player in free space', () => {
    expect(blocked(start.x, start.z)).toBe(false);
  });

  it('keeps stacks from overlapping each other or walls', () => {
    for (const pl of world.placements)
      for (const c of world.colliders) {
        if (c.id === pl.id) continue;
        const overlap = pl.footprint.minX < c.maxX && pl.footprint.maxX > c.minX && pl.footprint.minZ < c.maxZ && pl.footprint.maxZ > c.minZ;
        expect(overlap, `${pl.id} overlaps ${c.id}`).toBe(false);
      }
  });

  it('has walkable, reachable access points for every placement and zone', () => {
    const targets = [...PLACEMENTS.map((p) => ({ id: p.id, ...p.access })), ...ZONES.map((z) => ({ id: z.id, ...z.anchor }))];
    for (const t of targets) {
      expect(blocked(t.x, t.z), `${t.id} access blocked`).toBe(false);
      const path = findPath(world.nav, start, t);
      expect(path, `${t.id} unreachable`).not.toBeNull();
    }
  });

  it('access points are close enough to trigger the nearby prompt', () => {
    for (const p of world.placements) {
      const f = p.footprint;
      const dx = Math.max(f.minX - p.access.x, 0, p.access.x - f.maxX);
      const dz = Math.max(f.minZ - p.access.z, 0, p.access.z - f.maxZ);
      expect(Math.hypot(dx, dz), p.id).toBeLessThan(PLAYER.nearDist);
    }
  });

  it('does not let the player walk through the back wall', () => {
    let pos = { x: -10, z: -42 };
    for (let i = 0; i < 200; i++) pos = moveWithCollisions(pos.x, pos.z, 0, -0.05, PLAYER.radius, solid);
    expect(pos.z).toBeGreaterThan(-44);
  });

  it('lets the player slide along a wall', () => {
    const pos = moveWithCollisions(-14.3, -20, -0.3, -1, PLAYER.radius, solid);
    expect(pos.z).toBeLessThan(-20.5);
  });

  it('maps positions to zones', () => {
    expect(zoneAt(-9, -7)).toBe('construction');
    expect(zoneAt(-6, -24)).toBe('agriculture');
    expect(zoneAt(10, -22)).toBe('greenhouse');
    expect(zoneAt(-10, -38)).toBe('charcoal');
    expect(zoneAt(9, -3)).toBe('desk');
  });

  it('still guides a visitor standing right against a pile', () => {
    // inside the nav margin of the perche stack but not colliding (regression)
    const hug = { x: -5.79, z: -18.47 };
    expect(blocked(hug.x, hug.z)).toBe(false);
    const path = findPath(world.nav, hug, { x: -2.3, z: -27.5 });
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
  });
});
