import { Environment as DreiEnvironment, Lightformer, Sky, Sparkles } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SITE, WAREHOUSE } from '../../../config/depotLayout';
import type { QualityLevel } from '../../../types';
import type { DepotMaterials } from '../materials/materials';

/** Late-morning Gharb sun: high enough to light the yard, low enough for long shadows inside. */
export const SUN_POS = new THREE.Vector3(-22, 34, 16);

export function tiledPlane(w: number, h: number, tile: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (h / tile));
  g.rotateX(-Math.PI / 2);
  return g;
}

export function Lighting({ quality }: { quality: QualityLevel }) {
  const mapSize = quality === 'high' ? 4096 : 2048;
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, -20);
    return o;
  }, []);
  return (
    <>
      {/* sky light kept low so the roofed halls read as shade against the sunlit courtyard */}
      <hemisphereLight args={['#fff1da', '#7a5c3c', quality === 'low' ? 1.25 : 0.5]} />
      <ambientLight intensity={quality === 'low' ? 0.35 : 0.12} color="#ffe9c8" />
      <primitive object={target} />
      <directionalLight
        position={[SUN_POS.x, SUN_POS.y, SUN_POS.z - 20]}
        target={target}
        intensity={3.1}
        color="#ffe7c2"
        castShadow={quality !== 'low'}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <Sky sunPosition={SUN_POS.toArray()} turbidity={7} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.85} distance={4500} />
      <fog attach="fog" args={['#dccbb0', 45, 170]} />
      {quality !== 'low' && (
        <DreiEnvironment resolution={64} frames={1}>
          <Lightformer intensity={1.2} color="#fff2dc" position={[0, 10, 0]} scale={[30, 30, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={0.6} color="#d9b98a" position={[-20, 4, 0]} scale={[20, 6, 1]} rotation-y={Math.PI / 2} />
          <Lightformer intensity={0.4} color="#a9c0c8" position={[20, 6, -10]} scale={[20, 8, 1]} rotation-y={-Math.PI / 2} />
        </DreiEnvironment>
      )}
    </>
  );
}

export function Ground({ mats }: { mats: DepotMaterials }) {
  const W = WAREHOUSE;
  const hallFront = useMemo(() => tiledPlane(W.maxX - W.minX, 16, 6), [W.maxX, W.minX]);
  const hallBack = useMemo(() => tiledPlane(W.maxX - W.minX, 12, 6), [W.maxX, W.minX]);
  const court = useMemo(() => tiledPlane(W.maxX - W.minX, 16, 7), [W.maxX, W.minX]);
  const outside = useMemo(() => tiledPlane(260, 260, 9), []);
  const road = useMemo(() => tiledPlane(260, 9, 6), []);
  return (
    <group>
      <mesh geometry={outside} material={mats.ground} position={[0, -0.02, -20]} receiveShadow />
      <mesh geometry={road} position={[0, -0.01, SITE.maxZ + 6]} receiveShadow>
        <meshStandardMaterial color="#5f5a53" roughness={0.95} />
      </mesh>
      <mesh geometry={hallFront} material={mats.concrete} position={[0, 0.005, -8]} receiveShadow />
      <mesh geometry={court} material={mats.courtyard} position={[0, 0.004, -24]} receiveShadow />
      <mesh geometry={hallBack} material={mats.concrete} position={[0, 0.005, -38]} receiveShadow />
      {/* painted walkway lines down the central aisle */}
      {[-2.1, 2.1].map((x) =>
        [
          [-8, 16],
          [-38, 12],
        ].map(([z, len]) => (
          <mesh key={`${x}${z}`} position={[x, 0.012, z]} rotation-x={-Math.PI / 2} material={mats.paintLine} receiveShadow>
            <planeGeometry args={[0.1, len - 0.6]} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Dust motes inside the halls — only where light catches them. */
export function Dust({ quality }: { quality: QualityLevel }) {
  if (quality === 'low') return null;
  const n = quality === 'high' ? 140 : 60;
  return (
    <>
      <Sparkles count={n} scale={[26, 5, 14]} position={[0, 3, -8]} size={2.2} speed={0.18} opacity={0.5} color="#fff0d0" noise={0.6} />
      <Sparkles count={Math.round(n * 0.6)} scale={[26, 5, 10]} position={[0, 3, -38]} size={2.2} speed={0.18} opacity={0.45} color="#fff0d0" noise={0.6} />
    </>
  );
}

/** Eucalyptus windbreak around the site — the typical Gharb horizon. */
export function Trees({ quality }: { quality: QualityLevel }) {
  const trees = useMemo(() => {
    const out: { x: number; z: number; h: number; s: number }[] = [];
    let seed = 3;
    const r = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < (quality === 'low' ? 12 : 26); i++) {
      const side = i % 2 ? 1 : -1;
      out.push({ x: side * (26 + r() * 14), z: 24 - i * 3.4 - r() * 2, h: 9 + r() * 7, s: 2.4 + r() * 1.8 });
    }
    for (let i = 0; i < 8; i++) out.push({ x: -20 + i * 6 + r() * 2, z: -70 - r() * 8, h: 10 + r() * 6, s: 3 + r() * 1.5 });
    return out;
  }, [quality]);
  const parts = useMemo(() => {
    const trunk = trees.map((t) => mtx([t.x, t.h * 0.45, t.z], [0, 0, 0], [1, t.h * 0.9, 1]));
    const crown = trees.flatMap((t, i) => [
      mtx([t.x, t.h * 0.8, t.z], [0, i, 0], [t.s * 0.75, t.s * 1.1, t.s * 0.75]),
      mtx([t.x + t.s * 0.45, t.h * 0.66, t.z + 0.3], [0, i * 2, 0], [t.s * 0.6, t.s * 0.75, t.s * 0.6]),
      mtx([t.x - t.s * 0.4, t.h * 0.95, t.z - 0.2], [0, i * 3, 0], [t.s * 0.5, t.s * 0.7, t.s * 0.5]),
    ]);
    return { trunk, crown };
  }, [trees]);
  const geos = useMemo(() => ({ trunk: new THREE.CylinderGeometry(0.12, 0.28, 1, 6), crown: new THREE.IcosahedronGeometry(1, 3) }), []);
  const matsT = useMemo(
    () => ({ trunk: new THREE.MeshStandardMaterial({ color: '#d8cfc0', roughness: 0.85 }), crown: new THREE.MeshStandardMaterial({ color: '#66745a', roughness: 1 }) }),
    [],
  );
  return (
    <group>
      <MatrixInstances geometry={geos.trunk} material={matsT.trunk} matrices={parts.trunk} castShadow={quality === 'high'} />
      <MatrixInstances geometry={geos.crown} material={matsT.crown} matrices={parts.crown} castShadow={quality === 'high'} />
    </group>
  );
}

/** Static instanced mesh from a list of matrices (one draw call per material group). */
export function MatrixInstances({ geometry, material, matrices, colors, castShadow = false, receiveShadow = false }: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; matrices: THREE.Matrix4[]; colors?: THREE.Color[]; castShadow?: boolean; receiveShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrices.forEach((mx, i) => {
      m.setMatrixAt(i, mx);
      if (colors) m.setColorAt(i, colors[i]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices, colors, geometry, material]);
  if (!matrices.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow={castShadow} receiveShadow={receiveShadow} raycast={() => null} />;
}

export function mtx(pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
}
