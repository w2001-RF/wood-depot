import { Line } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GREENHOUSE, RACK, RACKS, TRELLIS, type ElementDef } from '../../../config/depotLayout';
import { MatrixInstances, mtx } from './Environment';
import { boardGeometry, pieceMaterials } from '../products/pieceGeometry';
import type { Product, QualityLevel } from '../../../types';
import type { DepotMaterials } from '../materials/materials';
import { rng } from '../materials/textures';
import { InteractiveElementGroup } from '../interactions/InteractiveProduct';

function Scatter({ geometry, material, mats, count, place }: { geometry: THREE.BufferGeometry; material: THREE.Material; mats?: unknown; count: number; place: (i: number, o: THREE.Object3D) => void }) {
  void mats;
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      place(i, o);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count, place]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow receiveShadow raycast={() => null} />;
}

/** Groups pieces by product + length so each group is one instanced mesh. */
function ElementGroups({ elements, byId, mats, quality }: { elements: ElementDef[]; byId: Record<string, Product>; mats: DepotMaterials; quality: QualityLevel }) {
  const groups = useMemo(() => {
    const m = new Map<string, ElementDef[]>();
    for (const e of elements) {
      const len = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1], e.to[2] - e.from[2]).toFixed(2);
      const k = `${e.productId}@${len}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return [...m.entries()];
  }, [elements]);
  return (
    <>
      {groups.map(([k, els]) => {
        const p = byId[els[0].productId];
        return p ? <InteractiveElementGroup key={k} product={p} pieces={els} mats={mats} quality={quality} /> : null;
      })}
    </>
  );
}

/**
 * Demonstration greenhouse assembled from the exact pieces sold in zone C.
 * Each structural member is individually selectable.
 */
export function Greenhouse({ elements, byId, mats, quality }: { elements: ElementDef[]; byId: Record<string, Product>; mats: DepotMaterials; quality: QualityLevel }) {
  const g = GREENHOUSE;
  const cx = (g.minX + g.maxX) / 2;
  const cz = (g.minZ + g.maxZ) / 2;
  const L = g.maxZ - g.minZ;
  const Wd = g.maxX - g.minX;
  const roofLen = Math.hypot(Wd / 2, g.ridge - g.eave);
  const ang = Math.atan2(g.ridge - g.eave, Wd / 2);
  const doorA = g.door.z - g.door.w / 2;
  const doorB = g.door.z + g.door.w / 2;
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-Wd / 2, 0);
    s.lineTo(Wd / 2, 0);
    s.lineTo(Wd / 2, g.eave);
    s.lineTo(0, g.ridge);
    s.lineTo(-Wd / 2, g.eave);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [Wd, g.eave, g.ridge]);
  const plantGeo = useMemo(() => new THREE.SphereGeometry(0.17, 9, 7), []);
  const r = useMemo(() => rng(17), []);
  const plantCount = quality === 'low' ? 24 : 64;
  const placePlant = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      const bed = i % 2 ? 12.25 : 10.15;
      const z = -25 + (Math.floor(i / 2) / (plantCount / 2)) * 6;
      o.position.set(bed + (r() - 0.5) * 0.5, 0.48 + r() * 0.1, z + r() * 0.15);
      o.scale.set(0.9 + r() * 0.6, 0.8 + r() * 0.9, 0.9 + r() * 0.6);
      o.rotation.set(0, r() * 6, 0);
    },
    [plantCount, r],
  );
  return (
    <group>
      <ElementGroups elements={elements} byId={byId} mats={mats} quality={quality} />
      {/* plastic film — never intercepts clicks so the frame stays selectable */}
      <group raycast={() => null}>
        <mesh position={[g.maxX + 0.02, g.eave / 2, cz]} rotation-y={Math.PI / 2} material={mats.film} raycast={() => null}>
          <planeGeometry args={[L, g.eave]} />
        </mesh>
        <mesh position={[g.minX - 0.02, g.eave / 2, (g.maxZ + doorB) / 2]} rotation-y={Math.PI / 2} material={mats.film} raycast={() => null}>
          <planeGeometry args={[g.maxZ - doorB, g.eave]} />
        </mesh>
        <mesh position={[g.minX - 0.02, g.eave / 2, (g.minZ + doorA) / 2]} rotation-y={Math.PI / 2} material={mats.film} raycast={() => null}>
          <planeGeometry args={[doorA - g.minZ, g.eave]} />
        </mesh>
        <mesh position={[g.minX - 0.02, (g.eave + 2.05) / 2, g.door.z]} rotation-y={Math.PI / 2} material={mats.film} raycast={() => null}>
          <planeGeometry args={[g.door.w, g.eave - 2.05]} />
        </mesh>
        {[g.maxZ + 0.02, g.minZ - 0.02].map((z) => (
          <mesh key={z} geometry={gable} position={[cx, 0, z]} material={mats.film} raycast={() => null} />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[cx + (s * Wd) / 4, (g.eave + g.ridge) / 2 + 0.03, cz]} rotation={[0, 0, s * -ang]} material={mats.film} raycast={() => null}>
            <boxGeometry args={[roofLen, 0.005, L]} />
          </mesh>
        ))}
      </group>
      {/* raised beds + crop */}
      {[10.15, 12.25].map((x) => (
        <mesh key={x} position={[x, 0.2, -22]} material={mats.soil} receiveShadow castShadow raycast={() => null}>
          <boxGeometry args={[0.9, 0.4, 6.4]} />
        </mesh>
      ))}
      <Scatter geometry={plantGeo} material={mats.plant} count={plantCount} place={placePlant} />
    </group>
  );
}

/** T-trellis orchard rows: agricultural posts and crossbars shown in use. */
export function Trellis({ elements, byId, mats, quality }: { elements: ElementDef[]; byId: Record<string, Product>; mats: DepotMaterials; quality: QualityLevel }) {
  const wires = useMemo(() => {
    const out: [number, number, number][][] = [];
    TRELLIS.rowsX.forEach((x) => {
      const z0 = TRELLIS.postsZ[0];
      const z1 = TRELLIS.postsZ[TRELLIS.postsZ.length - 1];
      for (const dx of [-0.55, 0.55]) out.push([[x + dx, TRELLIS.barY + 0.03, z0], [x + dx, TRELLIS.barY + 0.03, z1]]);
      out.push([[x, 1.1, z0], [x, 1.1, z1]]);
    });
    return out;
  }, []);
  const leafGeo = useMemo(() => new THREE.SphereGeometry(0.22, 9, 7), []);
  const r = useMemo(() => rng(29), []);
  const n = quality === 'low' ? 30 : 90;
  const placeLeaf = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      const x = TRELLIS.rowsX[i % 2] + (r() - 0.5) * 1.1;
      const z = TRELLIS.postsZ[0] + r() * (TRELLIS.postsZ[3] - TRELLIS.postsZ[0]);
      o.position.set(x, 1.2 + r() * 0.75, z);
      o.scale.set(0.7 + r(), 0.5 + r() * 0.6, 0.7 + r());
      o.rotation.set(r(), r() * 6, r());
    },
    [r],
  );
  return (
    <group>
      <ElementGroups elements={elements} byId={byId} mats={mats} quality={quality} />
      {wires.map((w, i) => (
        <Line key={i} points={w} color="#8b8f8a" lineWidth={1} />
      ))}
      <Scatter geometry={leafGeo} material={mats.plant} count={n} place={placeLeaf} />
      {TRELLIS.rowsX.map((x) => (
        <mesh key={x} position={[x, 0.01, (TRELLIS.postsZ[0] + TRELLIS.postsZ[3]) / 2]} rotation-x={-Math.PI / 2} material={mats.soil} receiveShadow raycast={() => null}>
          <planeGeometry args={[1.4, 10.5]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Cantilever racks loaded with timber — non-interactive stock that gives the
 * halls their height and density. Pieces are instanced per product.
 */
export function CantileverRacks({ byId, mats, quality }: { byId: Record<string, Product>; mats: DepotMaterials; quality: QualityLevel }) {
  const data = useMemo(() => {
    const r = rng(53);
    const uprights: THREE.Matrix4[] = [];
    const arms: THREE.Matrix4[] = [];
    const loads = new Map<string, { m: THREE.Matrix4[][]; c: THREE.Color[][] }>();
    const levels = quality === 'low' ? RACK.levels.slice(0, 2) : RACK.levels;
    for (const rk of RACKS) {
      const p = byId[rk.productId];
      const zLen = Math.abs(rk.z1 - rk.z0);
      const n = Math.max(2, Math.round(zLen / RACK.bay) + 1);
      for (let i = 0; i < n; i++) {
        const z = rk.z0 + ((rk.z1 - rk.z0) * i) / (n - 1);
        uprights.push(mtx([rk.x, RACK.height / 2, z], [0, 0, 0], [0.16, RACK.height, 0.2]));
        uprights.push(mtx([rk.x + (rk.dir * RACK.reach) / 2, 0.05, z], [0, 0, 0], [RACK.reach + 0.1, 0.1, 0.2]));
        for (const y of levels) arms.push(mtx([rk.x + (rk.dir * (RACK.reach - 0.1)) / 2, y - 0.04, z], [0, 0, rk.dir * 0.03], [RACK.reach - 0.1, 0.08, 0.09]));
      }
      if (!p || p.shape !== 'board') continue;
      const w = (p.dimensions.widthCm ?? 10) / 100;
      const t = (p.dimensions.thicknessCm ?? 5) / 100;
      const cols = Math.max(2, Math.floor((RACK.reach - 0.15) / (w + 0.006)));
      const rows = Math.max(2, Math.floor(0.62 / (t + 0.006)));
      const entry = loads.get(p.id) ?? { m: [[], []], c: [[], []] };
      loads.set(p.id, entry);
      const zc = (rk.z0 + rk.z1) / 2;
      for (const y of levels) {
        if (r() < 0.12) continue; // an empty arm here and there: stock moves
        const fill = 0.55 + r() * 0.45;
        for (let row = 0; row < rows; row++) {
          if (row / rows > fill) break;
          for (let c = 0; c < cols; c++) {
            if (row === Math.floor(rows * fill) - 1 && r() < 0.4) continue;
            const x = rk.x + rk.dir * (0.12 + (c + 0.5) * (w + 0.006));
            const v = (row + c) % 2;
            entry.m[v].push(mtx([x, y + t / 2 + row * (t + 0.006), zc + (r() - 0.5) * 0.12], [0, Math.PI / 2 + (r() < 0.5 ? Math.PI : 0), 0]));
            const k = 0.82 + r() * 0.26;
            entry.c[v].push(new THREE.Color(k, k * (0.97 + r() * 0.04), k * (0.93 + r() * 0.05)));
          }
        }
      }
    }
    return { uprights, arms, loads: [...loads.entries()] };
  }, [byId, quality]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const shadows = quality !== 'low';
  return (
    <group>
      <MatrixInstances geometry={box} material={mats.paintGreen} matrices={data.uprights} castShadow={shadows} receiveShadow />
      <MatrixInstances geometry={box} material={mats.paintOchre} matrices={data.arms} castShadow={shadows} />
      {data.loads.map(([id, ld]) => {
        const p = byId[id];
        const zLen = 4.4;
        const geo = boardGeometry(Math.min(p.dimensions.lengthM ?? 4, zLen), (p.dimensions.widthCm ?? 10) / 100, (p.dimensions.thicknessCm ?? 5) / 100);
        return [0, 1].map((v) => <MatrixInstances key={`${id}${v}`} geometry={geo} material={pieceMaterials(p, mats, v)} matrices={ld.m[v]} colors={ld.c[v]} castShadow={shadows} receiveShadow />);
      })}
    </group>
  );
}
