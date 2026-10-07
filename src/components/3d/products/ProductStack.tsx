import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Product, QualityLevel } from '../../../types';
import { BULK, PALLET, STACK, bagSize, stackSpec } from '../../../utils/stackLayout';
import type { DepotMaterials } from '../materials/materials';
import { rng } from '../materials/textures';
import { bagGeometry, boardGeometry, lumpGeometry, pieceMaterials, pileGeometry, poleGeometry, unitBox } from './pieceGeometry';

interface Instance {
  m: THREE.Matrix4;
  c: THREE.Color;
}

const tmpO = new THREE.Object3D();
function mat(x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  tmpO.position.set(x, y, z);
  tmpO.rotation.set(rx, ry, rz);
  tmpO.scale.set(sx, sy, sz);
  tmpO.updateMatrix();
  return tmpO.matrix.clone();
}

function Instances({ geometry, material, items, shadows }: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; items: Instance[]; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      m.setMatrixAt(i, it.m);
      m.setColorAt(i, it.c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    // also re-run if R3F rebuilt the mesh (new geometry/material/count)
  }, [items, geometry, material]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={shadows} receiveShadow />;
}

/** A pallet built from real-size slats (used under bags and in pallet piles). */
export function palletInstances(count: number, seed: number, out: { slats: Instance[]; blocks: Instance[] }, baseY = 0, ox = 0, oz = 0, ry = 0) {
  const r = rng(seed);
  const rot = new THREE.Matrix4().makeRotationY(ry);
  const off = new THREE.Matrix4().makeTranslation(ox, 0, oz);
  for (let k = 0; k < count; k++) {
    const y0 = baseY + k * PALLET.h;
    const jx = (r() - 0.5) * 0.05;
    const jz = (r() - 0.5) * 0.05;
    const tone = new THREE.Color().setScalar(0.8 + r() * 0.25);
    const push = (arr: Instance[], m: THREE.Matrix4) => arr.push({ m: off.clone().multiply(rot).multiply(m), c: tone });
    for (let i = 0; i < 7; i++) push(out.slats, mat(jx, y0 + 0.13, jz - 0.45 + i * 0.15, 0, 1.2, 0.022, 0.1));
    for (let i = 0; i < 3; i++) push(out.slats, mat(jx, y0 + 0.011, jz - 0.45 + i * 0.45, 0, 1.2, 0.022, 0.1));
    for (const bx of [-0.55, 0, 0.55]) for (const bz of [-0.45, 0, 0.45]) push(out.blocks, mat(jx + bx, y0 + 0.067, jz + bz, 0, 0.1, 0.09, 0.1));
  }
}

/**
 * One physical pile of a product at real scale, rendered with instancing
 * (a few draw calls per pile regardless of piece count).
 * Local frame: length on X, centred, base at y = 0.
 */
export function ProductStack({ product, mats, quality, seed = 1 }: { product: Product; mats: DepotMaterials; quality: QualityLevel; seed?: number }) {
  const spec = useMemo(() => stackSpec(product), [product]);
  const shadows = quality !== 'low';
  const data = useMemo(() => {
    const r = rng(seed * 977 + product.id.length * 13);
    const variants: [Instance[], Instance[]] = [[], []];
    const support: Instance[] = [];
    const pal = { slats: [] as Instance[], blocks: [] as Instance[] };
    const lumps: Instance[] = [];
    const straps: Instance[] = [];
    const buckles: Instance[] = [];
    const colorJitter = () => {
      const v = 0.8 + r() * 0.3;
      return new THREE.Color(v, v * (0.97 + r() * 0.04), v * (0.92 + r() * 0.06));
    };
    const L = spec.length;
    if (spec.kind === 'board') {
      const { pieceW: w, pieceT: t, cols, rows } = spec;
      // bearers
      for (const bx of [-L / 2 + 0.35, 0, L / 2 - 0.35]) support.push({ m: mat(bx, STACK.bearerH / 2, 0, 0, 0.09, STACK.bearerH, spec.depth + 0.12), c: new THREE.Color(0.7, 0.7, 0.7) });
      let y = STACK.bearerH;
      let yBeforeTop = y;
      for (let row = 0; row < rows; row++) {
        if (row === rows - 1) yBeforeTop = y;
        if (row > 0 && row % STACK.stickerEvery === 0) {
          if (quality !== 'low')
            for (const bx of [-L / 2 + 0.35, 0, L / 2 - 0.35])
              support.push({ m: mat(bx + (r() - 0.5) * 0.1, y + STACK.stickerT / 2, 0, (r() - 0.5) * 0.04, 0.045, STACK.stickerT, spec.depth + 0.06), c: colorJitter() });
          y += STACK.stickerT;
        }
        // top row is often partly taken — real stock is never a perfect block
        const topRow = row === rows - 1;
        for (let c = 0; c < cols; c++) {
          if (topRow && r() < 0.45) continue;
          const z = -spec.depth / 2 + (c + 0.5) * (w + STACK.gap);
          const jx = (r() - 0.5) * 0.09;
          const flip = r() < 0.5 ? Math.PI : 0;
          // sawmill tolerance: +-0.6 % length, +-1.5 % thickness, a hint of twist
          variants[(row + c) % 2].push({ m: mat(jx, y + t / 2, z, flip + (r() - 0.5) * 0.006, 1 + (r() - 0.5) * 0.012, 1 + (r() - 0.5) * 0.03, 1, (r() - 0.5) * 0.008), c: colorJitter() });
        }
        y += t + STACK.gap;
      }
      // polypropylene strapping: a band around the pack every ~1.4 m, with a metal seal
      if (quality !== 'low') {
        const sy0 = STACK.bearerH * 0.5;
        const sh = Math.max(0.1, yBeforeTop - sy0);
        const bands = Math.max(2, Math.round(L / 1.4));
        const white = new THREE.Color(1, 1, 1);
        for (let i = 0; i < bands; i++) {
          const bx = -L / 2 + 0.5 + ((L - 1) * (i + 0.5)) / bands + (r() - 0.5) * 0.08;
          const d = spec.depth;
          straps.push({ m: mat(bx, yBeforeTop + 0.002, 0, 0, 0.016, 0.003, d + 0.012), c: white });
          straps.push({ m: mat(bx, sy0, 0, 0, 0.016, 0.003, d + 0.012), c: white });
          for (const side of [-1, 1]) straps.push({ m: mat(bx, sy0 + sh / 2, side * (d / 2 + 0.005), 0, 0.016, sh, 0.003), c: white });
          buckles.push({ m: mat(bx, yBeforeTop * 0.55, d / 2 + 0.008, 0, 0.03, 0.022, 0.008), c: white });
        }
      }
    } else if (spec.kind === 'round') {
      const d = spec.pieceW;
      for (const bx of [-L / 2 + 0.3, L / 2 - 0.3]) support.push({ m: mat(bx, STACK.bearerH / 2, 0, 0, 0.1, STACK.bearerH, spec.depth + 0.15), c: new THREE.Color(0.7, 0.7, 0.7) });
      for (let row = 0; row < spec.rows; row++) {
        const n = spec.cols - row;
        if (n <= 0) break;
        for (let c = 0; c < n; c++) {
          const z = -spec.depth / 2 + d / 2 + row * (d / 2) + c * d;
          const yy = STACK.bearerH + d / 2 + row * d * 0.866;
          variants[(row + c) % 2].push({ m: mat((r() - 0.5) * 0.14, yy, z, 0, 1, 1, 1, r() * 6.28), c: colorJitter() });
        }
      }
    } else if (spec.kind === 'bag') {
      palletInstances(1, seed, pal);
      const b = bagSize(product);
      for (let layer = 0; layer < b.layers; layer++) {
        for (let ix = 0; ix < b.perX; ix++)
          for (let iz = 0; iz < b.perZ; iz++) {
            if (layer === b.layers - 1 && r() < 0.3) continue;
            const x = -PALLET.x / 2 + (ix + 0.5) * (PALLET.x / b.perX);
            const z = -PALLET.z / 2 + (iz + 0.5) * (PALLET.z / b.perZ);
            variants[0].push({ m: mat(x + (r() - 0.5) * 0.04, PALLET.h + layer * b.y + b.y / 2, z + (r() - 0.5) * 0.04, (r() - 0.5) * 0.12), c: colorJitter() });
          }
      }
    } else {
      for (let i = 0; i < (quality === 'low' ? 60 : 220); i++) {
        const a = r() * Math.PI * 2;
        const rad = BULK.radius * (0.7 + r() * 0.45);
        const s = 0.03 + r() * 0.06;
        lumps.push({ m: mat(Math.cos(a) * rad, s * 0.6, Math.sin(a) * rad, r() * 6, s, s * 0.8, s * 1.2, r(), r()), c: new THREE.Color().setScalar(0.7 + r() * 0.5) });
      }
    }
    return { variants, support, pal, lumps, straps, buckles };
  }, [spec, product, quality, seed]);

  const segs = quality === 'low' ? 7 : quality === 'medium' ? 10 : 14;
  if (spec.kind === 'board' || spec.kind === 'round') {
    const geo = spec.kind === 'board' ? boardGeometry(spec.length, spec.pieceW, spec.pieceT) : poleGeometry(spec.length, spec.pieceW, segs);
    return (
      <group>
        <Instances geometry={geo} material={pieceMaterials(product, mats, 0)} items={data.variants[0]} shadows={shadows} />
        <Instances geometry={geo} material={pieceMaterials(product, mats, 1)} items={data.variants[1]} shadows={shadows} />
        <Instances geometry={unitBox()} material={mats.sticker} items={data.support} shadows={shadows} />
        <Instances geometry={unitBox()} material={mats.strap} items={data.straps} shadows={false} />
        <Instances geometry={unitBox()} material={mats.steel} items={data.buckles} shadows={false} />
      </group>
    );
  }
  if (spec.kind === 'bag') {
    const b = bagSize(product);
    return (
      <group>
        <Instances geometry={unitBox()} material={mats.palletWood} items={data.pal.slats} shadows={shadows} />
        <Instances geometry={unitBox()} material={mats.palletWood} items={data.pal.blocks} shadows={shadows} />
        <Instances geometry={bagGeometry(b.x, b.y, b.z)} material={(product.dimensions.weightKg ?? 0) <= 6 ? mats.sack5 : mats.sack15} items={data.variants[0]} shadows={shadows} />
      </group>
    );
  }
  return (
    <group>
      <mesh geometry={pileGeometry(BULK.radius, BULK.height)} material={mats.charcoal} castShadow={shadows} receiveShadow />
      <Instances geometry={lumpGeometry()} material={mats.charcoal} items={data.lumps} shadows={false} />
    </group>
  );
}
