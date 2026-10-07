import { Html } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PROPS, PROP_FOOTPRINT, type PropDef } from '../../../config/depotLayout';
import { useT } from '../../../i18n';
import { useDepotStore } from '../../../stores/depotStore';
import type { Product, QualityLevel } from '../../../types';
import { isTouchDevice } from '../../../utils/webgl';
import type { DepotMaterials } from '../materials/materials';
import { palletInstances } from '../products/ProductStack';
import { boardGeometry, pieceMaterials, unitBox } from '../products/pieceGeometry';
import { openDesk } from '../interactions/actions';
import { HangingSign } from './Warehouse';

function InstancedBoxes({ items, material, shadows }: { items: { m: THREE.Matrix4; c: THREE.Color }[]; material: THREE.Material; shadows: boolean }) {
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
  }, [items, material]);
  return <instancedMesh ref={ref} args={[unitBox(), material, items.length]} castShadow={shadows} receiveShadow />;
}

/** Every loose pallet pile on site in two draw calls. */
export function PalletPiles({ mats, quality }: { mats: DepotMaterials; quality: QualityLevel }) {
  const data = useMemo(() => {
    const out = { slats: [] as { m: THREE.Matrix4; c: THREE.Color }[], blocks: [] as { m: THREE.Matrix4; c: THREE.Color }[] };
    PROPS.filter((p) => p.kind === 'pallets').forEach((p, i) => palletInstances(p.count ?? 1, 40 + i, out, 0, p.x, p.z, p.rotY));
    return out;
  }, []);
  const shadows = quality !== 'low';
  return (
    <group>
      <InstancedBoxes items={data.slats} material={mats.palletWood} shadows={shadows} />
      <InstancedBoxes items={data.blocks} material={mats.palletWood} shadows={shadows} />
    </group>
  );
}

function Wheel({ position, r = 0.28, w = 0.2, mats }: { position: [number, number, number]; r?: number; w?: number; mats: DepotMaterials }) {
  return (
    <mesh position={position} rotation-z={Math.PI / 2} material={mats.rubber} castShadow>
      <cylinderGeometry args={[r, r, w, 16]} />
    </mesh>
  );
}

export function Forklift({ p, mats }: { p: PropDef; mats: DepotMaterials }) {
  return (
    <group position={[p.x, 0, p.z]} rotation-y={p.rotY}>
      <mesh position={[0, 0.75, 0.2]} material={mats.paintOchre} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.9, 1.7]} />
      </mesh>
      <mesh position={[0, 0.7, 1.15]} material={mats.steel} castShadow>
        <boxGeometry args={[1.05, 0.8, 0.45]} />
      </mesh>
      <mesh position={[0, 1.35, 0.35]} material={mats.rubber}>
        <boxGeometry args={[0.5, 0.15, 0.5]} />
      </mesh>
      {/* overhead guard */}
      {[-0.48, 0.48].map((x) =>
        [-0.45, 0.75].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.7, z]} material={mats.steel}>
            <boxGeometry args={[0.06, 1.0, 0.06]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 2.22, 0.15]} material={mats.steel} castShadow>
        <boxGeometry args={[1.02, 0.06, 1.3]} />
      </mesh>
      {/* mast + forks */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 1.15, -0.78]} material={mats.steel} castShadow>
          <boxGeometry args={[0.1, 2.3, 0.12]} />
        </mesh>
      ))}
      {[-0.25, 0.25].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.08, -1.25]} material={mats.steel} castShadow>
          <boxGeometry args={[0.1, 0.05, 1.0]} />
        </mesh>
      ))}
      <Wheel position={[-0.55, 0.3, -0.45]} mats={mats} />
      <Wheel position={[0.55, 0.3, -0.45]} mats={mats} />
      <Wheel position={[-0.5, 0.22, 0.95]} r={0.22} mats={mats} />
      <Wheel position={[0.5, 0.22, 0.95]} r={0.22} mats={mats} />
    </group>
  );
}

/** Flatbed delivery truck loaded with timber, backed onto the loading door. */
export function Truck({ p, mats, loadProduct }: { p: PropDef; mats: DepotMaterials; loadProduct?: Product }) {
  const f = PROP_FOOTPRINT.truck;
  const load = useMemo(() => {
    if (!loadProduct) return null;
    const geo = boardGeometry(4, 0.2, 0.1);
    const items: THREE.Matrix4[] = [];
    const o = new THREE.Object3D();
    for (let row = 0; row < 6; row++)
      for (let c = 0; c < 10; c++) {
        o.position.set(0, row * 0.106, -0.95 + c * 0.21);
        o.rotation.set(0, 0, 0);
        o.updateMatrix();
        items.push(o.matrix.clone());
      }
    return { geo, items };
  }, [loadProduct]);
  const loadRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!loadRef.current || !load) return;
    load.items.forEach((m, i) => loadRef.current!.setMatrixAt(i, m));
    loadRef.current.instanceMatrix.needsUpdate = true;
    loadRef.current.computeBoundingSphere();
  }, [load]);
  return (
    <group position={[p.x, 0, p.z]} rotation-y={p.rotY}>
      {/* chassis */}
      <mesh position={[0, 0.65, 0]} material={mats.steel} castShadow>
        <boxGeometry args={[1.1, 0.25, f.depth - 0.4]} />
      </mesh>
      {/* cab at −z (towards the yard), bed toward the door */}
      <mesh position={[0, 1.55, -4.2]} material={mats.paintWhite} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.9, 2.2]} />
      </mesh>
      <mesh position={[0, 1.95, -3.08]} material={mats.glass}>
        <boxGeometry args={[2.2, 0.8, 0.04]} />
      </mesh>
      <mesh position={[0, 0.95, -4.2]} material={mats.paintGreen}>
        <boxGeometry args={[2.42, 0.18, 2.22]} />
      </mesh>
      <mesh position={[0, 0.95, 1.2]} material={mats.palletWood} castShadow receiveShadow>
        <boxGeometry args={[2.45, 0.12, 7.4]} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.25, 1.2]} material={mats.paintGreen}>
          <boxGeometry args={[0.06, 0.5, 7.4]} />
        </mesh>
      ))}
      {load && loadProduct && (
        <group position={[0, 1.07, 0.2]} rotation-y={Math.PI / 2}>
          <instancedMesh ref={loadRef} args={[load.geo, pieceMaterials(loadProduct, mats, 0), load.items.length]} castShadow />
        </group>
      )}
      {[-4.3, 2.2, 3.6].map((z) =>
        [-1.05, 1.05].map((x) => <Wheel key={`${x}${z}`} position={[x, 0.48, z]} r={0.48} w={0.32} mats={mats} />),
      )}
    </group>
  );
}

/**
 * The sales counter. Walking up to it is the in-world way to finish a quote,
 * mirroring the real visit (pick your wood, then go to the desk).
 */
export function Desk({ p, mats }: { p: PropDef; mats: DepotMaterials }) {
  const f = PROP_FOOTPRINT.desk;
  const focused = useDepotStore((s) => s.focusedId === 'desk' || s.hoveredId === 'desk');
  const setHovered = useDepotStore((s) => s.setHovered);
  const { t } = useT();
  const touch = isTouchDevice();
  const front = p.x - f.length / 2;
  return (
    <group>
      <group position={[p.x, 0, p.z]}>
        {/* cabin */}
        <mesh position={[0.2, f.height / 2, 0]} material={mats.wallBlock} castShadow receiveShadow>
          <boxGeometry args={[f.length - 0.4, f.height, f.depth]} />
        </mesh>
        <mesh position={[-f.length / 2 + 0.18, 1.85, 0]} material={mats.glass}>
          <boxGeometry args={[0.04, 1.1, 2.6]} />
        </mesh>
        <mesh position={[0.2, f.height + 0.08, 0]} material={mats.paintGreen}>
          <boxGeometry args={[f.length - 0.2, 0.16, f.depth + 0.2]} />
        </mesh>
      </group>
      {/* counter in front of the window */}
      <mesh
        position={[front - 0.25, 0.55, p.z]}
        material={mats.woodSide.eucalyptus[0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered('desk');
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 8) return;
          openDesk();
        }}
      >
        <boxGeometry args={[0.6, 1.1, 2.8]} />
      </mesh>
      <mesh position={[front - 0.25, 1.12, p.z]} material={mats.paintGreen}>
        <boxGeometry args={[0.7, 0.05, 2.9]} />
      </mesh>
      <HangingSign position={[front - 0.02, 2.75, p.z]} rotationY={-Math.PI / 2} fr={t('zone.desk')} ar="مكتب عروض الأسعار" code="€" accent="#a17d1e" width={2.8} cable={0.01} />
      {focused && (
        <Html position={[front - 0.3, 1.6, p.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="wd-prompt flex items-center gap-2 whitespace-nowrap border border-[#f2c879]/50 bg-[#1c130d]/85 py-1.5 ps-3 pe-1.5 text-[#f6f1e7] shadow-xl backdrop-blur-md">
            <span className="font-display text-[15px] font-bold uppercase tracking-wider">{t('depot.deskPrompt')}</span>
            {!touch && <kbd className="grid h-6 w-6 place-items-center rounded-[3px] bg-[#f6f1e7] text-xs font-bold text-[#1c130d]">E</kbd>}
          </div>
        </Html>
      )}
    </group>
  );
}
