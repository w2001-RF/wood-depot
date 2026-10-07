import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDepotStore } from '../../../stores/depotStore';
import { useUiStore } from '../../../stores/uiStore';
import { translate } from '../../../i18n';
import { type DepotWorld, findPath } from '../../../utils/depotWorld';
import { playerRuntime } from '../runtime';

const MAX = 90;
const SPACING = 0.9;

/**
 * Floor-painted chevrons that flow toward the destination, plus a soft beacon.
 * Recomputed as the visitor walks, cleared on arrival.
 */
export function GuidePath({ world }: { world: DepotWorld }) {
  const guide = useDepotStore((s) => s.guide);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const beacon = useRef<THREE.Group>(null);
  const path = useRef<{ x: number; z: number }[]>([]);
  const timer = useRef(0);
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.22, -0.16);
    s.lineTo(0, 0.12);
    s.lineTo(0.22, -0.16);
    s.lineTo(0.22, -0.04);
    s.lineTo(0, 0.24);
    s.lineTo(-0.22, -0.04);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f2c879', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    timer.current = 0;
    if (!guide) {
      path.current = [];
      playerRuntime.path = [];
    }
  }, [guide]);

  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const g = useDepotStore.getState().guide;
    if (!g || useDepotStore.getState().phase !== 'explore') {
      m.count = 0;
      if (beacon.current) beacon.current.visible = false;
      return;
    }
    timer.current -= dt;
    if (timer.current <= 0) {
      timer.current = 0.35;
      const p = findPath(world.nav, { x: playerRuntime.x, z: playerRuntime.z }, g.point);
      path.current = p ?? [];
      playerRuntime.path = path.current;
      const remaining = Math.hypot(g.point.x - playerRuntime.x, g.point.z - playerRuntime.z);
      if (remaining < 1.6) {
        const lang = useUiStore.getState().lang;
        useUiStore.getState().toast(translate(lang, 'depot.arrived', { name: g.label }), 'success');
        const depot = useDepotStore.getState();
        depot.setGuide(null);
        // turn to face the product and highlight it
        const it = g.productPlacementId ? world.interactables.find((i) => i.id === g.productPlacementId) : null;
        if (it) {
          const cx = Math.min(Math.max(playerRuntime.x, it.bounds.minX), it.bounds.maxX);
          const cz = Math.min(Math.max(playerRuntime.z, it.bounds.minZ), it.bounds.maxZ);
          const dx = (Math.hypot(cx - playerRuntime.x, cz - playerRuntime.z) < 0.3 ? it.center[0] : cx) - playerRuntime.x;
          const dz = (Math.hypot(cx - playerRuntime.x, cz - playerRuntime.z) < 0.3 ? it.center[2] : cz) - playerRuntime.z;
          playerRuntime.turnTo = Math.atan2(-dx, -dz);
          depot.setFocused(it.id);
        }
        return;
      }
    }
    // lay chevrons along the polyline, flowing forward over time
    const pts = path.current;
    const flow = (clock.elapsedTime * 1.4) % SPACING;
    let n = 0;
    let carried = SPACING - flow;
    for (let i = 1; i < pts.length && n < MAX; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const ang = Math.atan2(b.x - a.x, b.z - a.z);
      let d = carried;
      while (d < len && n < MAX) {
        const t = d / len;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const near = Math.hypot(x - playerRuntime.x, z - playerRuntime.z);
        if (near > 0.8) {
          dummy.position.set(x, 0.025, z);
          dummy.rotation.set(0, ang + Math.PI, 0);
          dummy.scale.setScalar(Math.min(1, near / 2.2));
          dummy.updateMatrix();
          m.setMatrixAt(n++, dummy.matrix);
        }
        d += SPACING;
      }
      carried = d - len;
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    material.opacity = 0.65 + Math.sin(clock.elapsedTime * 3) * 0.15;
    if (beacon.current) {
      beacon.current.visible = true;
      beacon.current.position.set(g.point.x, 0, g.point.z);
      beacon.current.rotation.y += dt * 0.8;
    }
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[geometry, material, MAX]} frustumCulled={false} renderOrder={3} />
      <group ref={beacon} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.45, 0.6, 40]} />
          <meshBasicMaterial color="#f2c879" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 3.2, 24, 1, true]} />
          <meshBasicMaterial color="#f2c879" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
