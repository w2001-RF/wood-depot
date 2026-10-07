import { Html, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PLAYER } from '../../../config/depotLayout';
import { useT } from '../../../i18n';
import { interactionStateOf, useDepotStore, type InteractionState } from '../../../stores/depotStore';
import { selectOverlayOpen, useUiStore } from '../../../stores/uiStore';
import type { Product, QualityLevel, ZoneId } from '../../../types';
import { stackSpec, pieceSection } from '../../../utils/stackLayout';
import { isTouchDevice } from '../../../utils/webgl';
import type { DepotMaterials } from '../materials/materials';
import { ProductStack } from '../products/ProductStack';
import { boardGeometry, pieceMaterials, poleGeometry } from '../products/pieceGeometry';
import { hasLineOfSight, openInspection } from './actions';

const STATE_STYLE: Record<InteractionState, { color: string; opacity: number; width: number; emissive: number }> = {
  idle: { color: '#d9c3a0', opacity: 0, width: 1, emissive: 0 },
  nearby: { color: '#ecdfc8', opacity: 0.75, width: 1.6, emissive: 0.1 },
  hover: { color: '#ffffff', opacity: 1, width: 2.2, emissive: 0.18 },
  selected: { color: '#f2c879', opacity: 1, width: 3, emissive: 0.35 },
  inspecting: { color: '#f2c879', opacity: 1, width: 2.4, emissive: 0.25 },
  added: { color: '#7fd49c', opacity: 1, width: 3, emissive: 0.3 },
  guided: { color: '#f2c879', opacity: 0.9, width: 2.4, emissive: 0.2 },
};

/**
 * Footprint outline painted on the floor around the pile: reads as "this stock
 * is selectable", is depth-tested, and never slices across the camera up close.
 */
function outlinePoints(sx: number, sz: number): THREE.Vector3[] {
  const hx = sx / 2 + 0.18;
  const hz = sz / 2 + 0.18;
  const r = Math.min(0.22, hx * 0.5, hz * 0.5);
  const pts: THREE.Vector3[] = [];
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0.03, cz + Math.sin(a) * r));
    }
  };
  corner(hx - r, hz - r, 0);
  corner(-hx + r, hz - r, Math.PI / 2);
  corner(-hx + r, -hz + r, Math.PI);
  corner(hx - r, -hz + r, (3 * Math.PI) / 2);
  pts.push(pts[0].clone());
  return pts;
}

function useInteractionState(id: string) {
  const selector = useCallback((s: Parameters<typeof interactionStateOf>[0]) => interactionStateOf(s, id), [id]);
  return useDepotStore(selector);
}

function useHandlers(id: string, product: Product) {
  const setHovered = useDepotStore((s) => s.setHovered);
  const { t, l } = useT();
  const toast = useUiStore((s) => s.toast);
  const blocked = () => useDepotStore.getState().phase !== 'explore' || selectOverlayOpen(useUiStore.getState());
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (blocked() || e.pointerType === 'touch') return;
      if (e.distance > PLAYER.clickDist || !hasLineOfSight(e.point.x, e.point.z)) return;
      setHovered(id);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      if (useDepotStore.getState().hoveredId === id) setHovered(null);
      document.body.style.cursor = '';
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (blocked() || e.delta > 8) return; // a drag-to-look, not a click
      if (!hasLineOfSight(e.point.x, e.point.z)) return;
      if (e.distance > PLAYER.clickDist) {
        toast(`${l(product.name)} — ${t('depot.tooFar')}`, 'info');
        return;
      }
      document.body.style.cursor = '';
      openInspection(id, product.id);
    },
  };
}

function Prompt({ product, y, state, flashQty }: { product: Product; y: number; state: InteractionState; flashQty?: number }) {
  const { t, l } = useT();
  const touch = isTouchDevice();
  if (state === 'added')
    return (
      <Html position={[0, y + 0.45, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="wd-float-up whitespace-nowrap rounded-sm bg-[#1f3a2e] px-3 py-1.5 font-display text-lg font-bold tracking-wide text-[#f6f1e7] shadow-lg">
          +{flashQty} ✓
        </div>
      </Html>
    );
  if (state !== 'nearby' && state !== 'hover') return null;
  return (
    <Html position={[0, y + 0.35, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="wd-prompt flex items-center gap-2 whitespace-nowrap border border-[#ecdfc8]/30 bg-[#1c130d]/80 py-1.5 ps-3 pe-1.5 text-[#f6f1e7] shadow-xl backdrop-blur-md">
        <span className="font-display text-[15px] font-bold uppercase tracking-wider">{l(product.name)}</span>
        {touch ? (
          <span className="text-[11px] text-[#d9c3a0]">{t('depot.tap')}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-[#d9c3a0]">
            <kbd className="grid h-6 w-6 place-items-center rounded-[3px] border border-[#ecdfc8]/50 bg-[#f6f1e7] font-sans text-xs font-bold text-[#1c130d]">E</kbd>
          </span>
        )}
      </div>
    </Html>
  );
}

interface StackProps {
  id: string;
  product: Product;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  zone: ZoneId;
  mats: DepotMaterials;
  quality: QualityLevel;
  seed?: number;
}

/**
 * A stock pile in the depot that the visitor can approach, inspect and add to
 * the cart. All interaction logic lives here — placements only pass data.
 */
export const InteractiveProduct = memo(function InteractiveProduct({ id, product, position, rotation = 0, scale = 1, mats, quality, seed }: StackProps) {
  const state = useInteractionState(id);
  const added = useDepotStore((s) => (s.added?.id === id ? s.added.qty : 0));
  const spec = useMemo(() => stackSpec(product), [product]);
  const handlers = useHandlers(id, product);
  const lineRef = useRef<THREE.Group>(null);
  const style = STATE_STYLE[state];
  const pts = useMemo(() => outlinePoints(spec.length, spec.depth), [spec]);

  // guided piles breathe gently so they can be spotted from across the hall
  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const pulse = state === 'guided' ? 0.6 + Math.sin(clock.elapsedTime * 4) * 0.4 : 1;
    lineRef.current.scale.set(state === 'selected' ? 1.04 : 1, 1, state === 'selected' ? 1.04 : 1);
    lineRef.current.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material & { opacity?: number };
      if (m && 'opacity' in m) m.opacity = style.opacity * pulse;
    });
  });

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <group {...handlers}>
        <ProductStack product={product} mats={mats} quality={quality} seed={seed} />
      </group>
      {style.opacity > 0 && (
        <group ref={lineRef}>
          <Line points={pts} color={style.color} lineWidth={style.width + 1} transparent opacity={style.opacity} />
        </group>
      )}
      <Prompt product={product} y={spec.height} state={state} flashQty={added} />
    </group>
  );
});

/**
 * Structural pieces (greenhouse frame, trellis posts…) shown in their real use.
 * Pieces of the same product and length share ONE instanced mesh (2 draw calls)
 * yet stay individually selectable via instanceId; highlight = instance colour.
 */
export interface ElementPiece {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
}

const BASE = new THREE.Color(1, 1, 1);
const TINT: Partial<Record<InteractionState, THREE.Color>> = {
  nearby: new THREE.Color(1.25, 1.12, 0.92),
  hover: new THREE.Color(1.45, 1.28, 0.9),
  selected: new THREE.Color(1.75, 1.45, 0.8),
  inspecting: new THREE.Color(1.6, 1.38, 0.85),
  guided: new THREE.Color(1.6, 1.38, 0.85),
  added: new THREE.Color(0.85, 1.5, 0.95),
};

export const InteractiveElementGroup = memo(function InteractiveElementGroup({
  product,
  pieces,
  mats,
  quality,
}: {
  product: Product;
  pieces: ElementPiece[];
  mats: DepotMaterials;
  quality: QualityLevel;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const ids = useMemo(() => pieces.map((p) => p.id), [pieces]);
  const { geometry, matrices, tops } = useMemo(() => {
    const a = new THREE.Vector3(...pieces[0].from);
    const b = new THREE.Vector3(...pieces[0].to);
    const len = a.distanceTo(b);
    const s = pieceSection(product);
    const geo = s.round ? poleGeometry(len, s.w, quality === 'low' ? 7 : 12) : boardGeometry(len, s.w, s.t);
    const o = new THREE.Object3D();
    const ms: THREE.Matrix4[] = [];
    const tp: [number, number, number][] = [];
    for (const p of pieces) {
      const pa = new THREE.Vector3(...p.from);
      const pb = new THREE.Vector3(...p.to);
      o.position.copy(pa).add(pb).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), pb.clone().sub(pa).normalize());
      o.scale.setScalar(1);
      o.updateMatrix();
      ms.push(o.matrix.clone());
      tp.push([o.position.x, Math.max(pa.y, pb.y), o.position.z]);
    }
    return { geometry: geo, matrices: ms, tops: tp };
  }, [pieces, product, quality]);
  const material = pieceMaterials(product, mats, ids[0].length);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrices.forEach((mx, i) => {
      m.setMatrixAt(i, mx);
      m.setColorAt(i, BASE);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices, geometry, material]);

  // the one piece of this group that currently needs feedback (prompt / flash)
  const activeSel = useCallback(
    (s: Parameters<typeof interactionStateOf>[0]) => {
      for (const id of ids) {
        const st = interactionStateOf(s, id);
        if (st !== 'idle' && st !== 'guided') return `${id}|${st}`;
      }
      return '';
    },
    [ids],
  );
  const active = useDepotStore(activeSel);
  const added = useDepotStore((s) => (s.added && ids.includes(s.added.id) ? s.added.qty : 0));
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || !m.instanceColor) return;
    const s = useDepotStore.getState();
    const pulse = 0.6 + Math.sin(clock.elapsedTime * 4) * 0.4;
    ids.forEach((id, i) => {
      const st = interactionStateOf(s, id);
      const tint = TINT[st];
      if (tint) tmp.copy(BASE).lerp(tint, st === 'guided' ? pulse : 1);
      else tmp.copy(BASE);
      m.setColorAt(i, tmp);
    });
    m.instanceColor.needsUpdate = true;
  });

  const idOf = (e: { instanceId?: number }) => (e.instanceId != null ? ids[e.instanceId] : null);
  const setHovered = useDepotStore((s) => s.setHovered);
  const { t, l } = useT();
  const toast = useUiStore((s) => s.toast);
  const blocked = () => useDepotStore.getState().phase !== 'explore' || selectOverlayOpen(useUiStore.getState());
  const [activeId, activeState] = active ? (active.split('|') as [string, InteractionState]) : [null, 'idle' as InteractionState];
  const activeIdx = activeId ? ids.indexOf(activeId) : -1;

  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[geometry, material, pieces.length]}
        castShadow={quality !== 'low'}
        receiveShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          if (blocked() || e.pointerType === 'touch') return;
          const id = idOf(e);
          if (!id || e.distance > PLAYER.clickDist || !hasLineOfSight(e.point.x, e.point.z)) return;
          if (useDepotStore.getState().hoveredId !== id) setHovered(id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (ids.includes(useDepotStore.getState().hoveredId ?? '')) setHovered(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          const id = idOf(e);
          if (!id || blocked() || e.delta > 8 || !hasLineOfSight(e.point.x, e.point.z)) return;
          if (e.distance > PLAYER.clickDist) {
            toast(`${l(product.name)} — ${t('depot.tooFar')}`, 'info');
            return;
          }
          document.body.style.cursor = '';
          openInspection(id, product.id);
        }}
      />
      {activeIdx >= 0 && (
        <group position={[tops[activeIdx][0], 0, tops[activeIdx][2]]}>
          <Prompt product={product} y={tops[activeIdx][1]} state={activeState} flashQty={added} />
        </group>
      )}
    </group>
  );
});
