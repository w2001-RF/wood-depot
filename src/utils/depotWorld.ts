import {
  GREENHOUSE,
  NAV_NODES,
  PLACEMENTS,
  PLAYER,
  PROPS,
  PROP_FOOTPRINT,
  RACK,
  RACKS,
  SITE,
  TRELLIS,
  WAREHOUSE,
  ZONES,
  greenhouseElements,
  trellisElements,
  type ElementDef,
  type PlacementDef,
} from '../config/depotLayout';
import type { Product, ZoneId } from '../types';
import { type Collider, type Rect, inflate, rectContains, rotatedFootprint, segmentIntersectsRect } from './geometry2d';
import { PALLET, pieceSection, stackSpec, type StackSpec } from './stackLayout';

export interface Bounds3 {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Interactable {
  id: string;
  kind: 'product' | 'desk';
  productId?: string;
  zone: ZoneId;
  bounds: Bounds3;
  center: [number, number, number];
  /** where guidance should lead */
  access: { x: number; z: number };
  /** single structural element (greenhouse / trellis) vs a stock pile */
  element: boolean;
}

export interface ResolvedPlacement extends PlacementDef {
  spec: StackSpec;
  footprint: Rect;
}

export interface DepotWorld {
  colliders: Collider[];
  /** colliders inflated by the player radius, for navigation checks */
  walkBlockers: Rect[];
  interactables: Interactable[];
  placements: ResolvedPlacement[];
  elements: ElementDef[];
  nav: NavGraph;
}

const col = (id: string, r: Rect, maxY: number, occludes = false, minY = 0): Collider => ({ id, ...r, minY, maxY, occludes });

function elementBounds(e: ElementDef, product: Product): Bounds3 {
  const s = pieceSection(product);
  const pad = Math.max(s.w, s.t) / 2 + 0.03;
  return {
    minX: Math.min(e.from[0], e.to[0]) - pad,
    maxX: Math.max(e.from[0], e.to[0]) + pad,
    minY: Math.min(e.from[1], e.to[1]) - pad,
    maxY: Math.max(e.from[1], e.to[1]) + pad,
    minZ: Math.min(e.from[2], e.to[2]) - pad,
    maxZ: Math.max(e.from[2], e.to[2]) + pad,
  };
}

const centerOf = (b: Bounds3): [number, number, number] => [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2];

export function buildDepotWorld(byId: Record<string, Product>): DepotWorld {
  const W = WAREHOUSE;
  const t = W.wallT / 2;
  const colliders: Collider[] = [
    // building shell (doors left open)
    col('wall-front-l', { minX: W.minX - t, maxX: W.frontDoor.minX, minZ: -t, maxZ: t }, W.eave, true),
    col('wall-front-r', { minX: W.frontDoor.maxX, maxX: W.maxX + t, minZ: -t, maxZ: t }, W.eave, true),
    col('wall-back-l', { minX: W.minX - t, maxX: W.backDoor.minX, minZ: W.minZ - t, maxZ: W.minZ + t }, W.eave, true),
    col('wall-back-r', { minX: W.backDoor.maxX, maxX: W.maxX + t, minZ: W.minZ - t, maxZ: W.minZ + t }, W.eave, true),
    col('wall-left', { minX: W.minX - t, maxX: W.minX + t + 0.2, minZ: W.minZ, maxZ: 0 }, W.eave, true),
    col('wall-right', { minX: W.maxX - t - 0.2, maxX: W.maxX + t, minZ: W.minZ, maxZ: 0 }, W.eave, true),
    // site fences
    col('fence-front', { minX: SITE.minX, maxX: SITE.maxX, minZ: SITE.maxZ - 0.2, maxZ: SITE.maxZ }, 2),
    col('fence-fl', { minX: SITE.minX, maxX: SITE.minX + 0.2, minZ: 0, maxZ: SITE.maxZ }, 2),
    col('fence-fr', { minX: SITE.maxX - 0.2, maxX: SITE.maxX, minZ: 0, maxZ: SITE.maxZ }, 2),
    col('fence-fl2', { minX: SITE.minX, maxX: W.minX, minZ: -0.2, maxZ: 0.2 }, 2),
    col('fence-fr2', { minX: W.maxX, maxX: SITE.maxX, minZ: -0.2, maxZ: 0.2 }, 2),
    col('fence-back', { minX: -16, maxX: 16, minZ: SITE.minZ, maxZ: SITE.minZ + 0.2 }, 2),
    col('fence-bl', { minX: -16.2, maxX: -16, minZ: SITE.minZ, maxZ: W.minZ }, 2),
    col('fence-br', { minX: 16, maxX: 16.2, minZ: SITE.minZ, maxZ: W.minZ }, 2),
  ];

  // greenhouse film walls with a door on the west face
  const g = GREENHOUSE;
  const d0 = g.door.z - g.door.w / 2;
  const d1 = g.door.z + g.door.w / 2;
  colliders.push(
    col('gh-w1', { minX: g.minX - 0.08, maxX: g.minX + 0.08, minZ: g.minZ, maxZ: d0 }, g.eave),
    col('gh-w2', { minX: g.minX - 0.08, maxX: g.minX + 0.08, minZ: d1, maxZ: g.maxZ }, g.eave),
    col('gh-e', { minX: g.maxX - 0.08, maxX: g.maxX + 0.08, minZ: g.minZ, maxZ: g.maxZ }, g.eave),
    col('gh-n', { minX: g.minX, maxX: g.maxX, minZ: g.maxZ - 0.08, maxZ: g.maxZ + 0.08 }, g.eave),
    col('gh-s', { minX: g.minX, maxX: g.maxX, minZ: g.minZ - 0.08, maxZ: g.minZ + 0.08 }, g.eave),
    col('gh-bed-1', { minX: 9.7, maxX: 10.6, minZ: -25.2, maxZ: -18.8 }, 0.4),
    col('gh-bed-2', { minX: 11.8, maxX: 12.7, minZ: -25.2, maxZ: -18.8 }, 0.4),
  );
  // the ridge supports stand in the gable walls, already covered above

  // trellis posts
  TRELLIS.rowsX.forEach((x, r) =>
    TRELLIS.postsZ.forEach((z, i) => colliders.push(col(`tr-${r}-${i}`, { minX: x - 0.15, maxX: x + 0.15, minZ: z - 0.15, maxZ: z + 0.15 }, 2))),
  );

  // cantilever racks (column line + arm reach)
  for (const r of RACKS) {
    const xa = r.x - (r.dir > 0 ? 0.15 : -0.15);
    const xb = r.x + r.dir * RACK.reach;
    colliders.push(col(r.id, { minX: Math.min(xa, xb), maxX: Math.max(xa, xb), minZ: Math.min(r.z0, r.z1), maxZ: Math.max(r.z0, r.z1) }, RACK.height, false));
  }

  // props
  for (const p of PROPS) {
    const f = PROP_FOOTPRINT[p.kind];
    const h = p.kind === 'pallets' ? (p.count ?? 1) * f.height : f.height;
    colliders.push(col(p.id, rotatedFootprint(p.x, p.z, f.length, f.depth, p.rotY), h, p.kind !== 'pallets'));
  }

  // product stacks
  const placements: ResolvedPlacement[] = [];
  const interactables: Interactable[] = [];
  for (const pl of PLACEMENTS) {
    const product = byId[pl.productId];
    if (!product) continue;
    const spec = stackSpec(product);
    let footprint = rotatedFootprint(pl.x, pl.z, spec.length, spec.depth, pl.rotY);
    if (spec.kind === 'bulk') footprint = inflate(footprint, -0.45); // round heap: walkable corners
    if (spec.kind === 'bag') footprint = rotatedFootprint(pl.x, pl.z, PALLET.x, PALLET.z, pl.rotY);
    placements.push({ ...pl, spec, footprint });
    colliders.push(col(pl.id, footprint, spec.height));
    const bounds: Bounds3 = { ...footprint, minY: 0, maxY: spec.height };
    interactables.push({ id: pl.id, kind: 'product', productId: pl.productId, zone: pl.zone, bounds, center: centerOf(bounds), access: pl.access, element: false });
  }

  const elements = [...greenhouseElements(), ...trellisElements()];
  for (const e of elements) {
    const product = byId[e.productId];
    if (!product) continue;
    const bounds = elementBounds(e, product);
    const c = centerOf(bounds);
    const inside = e.zone === 'greenhouse';
    interactables.push({
      id: e.id,
      kind: 'product',
      productId: e.productId,
      zone: e.zone,
      bounds,
      center: c,
      access: inside ? { x: 9.1, z: -22 } : { x: e.from[0] + 1.5, z: c[2] },
      element: true,
    });
  }

  const desk = PROPS.find((p) => p.kind === 'desk')!;
  const df = PROP_FOOTPRINT.desk;
  const deskRect = rotatedFootprint(desk.x, desk.z, df.length, df.depth, desk.rotY);
  interactables.push({
    id: 'desk',
    kind: 'desk',
    zone: 'desk',
    bounds: { ...deskRect, minY: 0, maxY: df.height },
    center: [deskRect.minX, 1.2, desk.z],
    access: { x: 8.8, z: -3 },
    element: false,
  });

  const walkBlockers = colliders.filter((c) => c.maxY > 0.25).map((c) => inflate(c, PLAYER.radius * 1.1));
  const nav = buildNavGraph(walkBlockers);
  return { colliders, walkBlockers, interactables, placements, elements, nav };
}

// ---------------------------------------------------------------- navigation

export interface NavGraph {
  nodes: { x: number; z: number }[];
  edges: number[][];
  blockers: Rect[];
}

export function segmentClear(ax: number, az: number, bx: number, bz: number, blockers: Rect[]): boolean {
  for (const b of blockers) if (segmentIntersectsRect(ax, az, bx, bz, b)) return false;
  return true;
}

function buildNavGraph(blockers: Rect[]): NavGraph {
  const nodes = NAV_NODES;
  const edges: number[][] = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 16) continue;
      if (segmentClear(a.x, a.z, b.x, b.z, blockers)) {
        edges[i].push(j);
        edges[j].push(i);
      }
    }
  return { nodes, edges, blockers };
}

/** Shortest collision-free path (Dijkstra over waypoints + temporary start/goal). */
export function findPath(g: NavGraph, from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number }[] | null {
  // A visitor standing right next to a pile is inside its safety margin: ignore the
  // margins that contain the start/goal, otherwise no route could ever leave there.
  const fromBlockers = g.blockers.filter((b) => !rectContains(b, from.x, from.z));
  const toBlockers = g.blockers.filter((b) => !rectContains(b, to.x, to.z));
  const both = fromBlockers.filter((b) => toBlockers.includes(b));
  if (segmentClear(from.x, from.z, to.x, to.z, both)) return [from, to];
  const n = g.nodes.length;
  const S = n;
  const T = n + 1;
  const pts = [...g.nodes, from, to];
  const adj: number[][] = g.edges.map((e) => [...e]);
  adj.push([], []);
  for (let i = 0; i < n; i++) {
    const p = g.nodes[i];
    if (segmentClear(from.x, from.z, p.x, p.z, fromBlockers)) {
      adj[S].push(i);
      adj[i].push(S);
    }
    if (segmentClear(to.x, to.z, p.x, p.z, toBlockers)) {
      adj[T].push(i);
      adj[i].push(T);
    }
  }
  const dist = new Array(n + 2).fill(Infinity);
  const prev = new Array(n + 2).fill(-1);
  const done = new Array(n + 2).fill(false);
  dist[S] = 0;
  for (let iter = 0; iter < n + 2; iter++) {
    let u = -1;
    for (let i = 0; i < n + 2; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    if (u === T) break;
    done[u] = true;
    for (const v of adj[u]) {
      const w = dist[u] + Math.hypot(pts[u].x - pts[v].x, pts[u].z - pts[v].z);
      if (w < dist[v]) {
        dist[v] = w;
        prev[v] = u;
      }
    }
  }
  if (dist[T] === Infinity) return null;
  const path: { x: number; z: number }[] = [];
  for (let v = T; v >= 0; v = prev[v]) {
    path.unshift(pts[v]);
    if (v === S) break;
  }
  return path;
}

export function pathLength(p: { x: number; z: number }[]): number {
  let d = 0;
  for (let i = 1; i < p.length; i++) d += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z);
  return d;
}

export function zoneAt(x: number, z: number): ZoneId {
  const desk = ZONES.find((zz) => zz.id === 'desk')!;
  if (x >= desk.rect.minX - 2.2 && x <= desk.rect.maxX && z >= desk.rect.minZ - 1 && z <= desk.rect.maxZ + 1) return 'desk';
  for (const zd of ZONES) {
    if (zd.id === 'desk') continue;
    if (x >= zd.rect.minX && x <= zd.rect.maxX && z >= zd.rect.minZ && z <= zd.rect.maxZ) return zd.id;
  }
  return z > 0 ? 'entrance' : 'yard';
}
