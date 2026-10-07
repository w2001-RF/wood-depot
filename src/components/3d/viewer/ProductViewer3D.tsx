import { Bounds, ContactShadows, Environment, Lightformer, Line, OrbitControls, useBounds } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Lang, Product } from '../../../types';
import { formatCm, formatLen } from '../../../utils/format';
import { bagSize } from '../../../utils/stackLayout';
import { getMaterialsSync } from '../materials/materials';
import { bagGeometry, boardGeometry, lumpGeometry, pieceMaterials, pileGeometry, poleGeometry } from '../products/pieceGeometry';

export type ViewerMode = 'overview' | 'section';

function pieceDims(p: Product) {
  const d = p.dimensions;
  if (p.shape === 'round') return { L: d.lengthM ?? 2, w: (d.diameterCm ?? 10) / 100, t: (d.diameterCm ?? 10) / 100 };
  if (p.shape === 'board') return { L: d.lengthM ?? 2, w: (d.widthCm ?? 10) / 100, t: (d.thicknessCm ?? 5) / 100 };
  if (p.shape === 'bag') {
    const b = bagSize(p);
    return { L: b.x, w: b.z, t: b.y };
  }
  return { L: 0.8, w: 0.8, t: 0.3 };
}

function Piece({ product }: { product: Product }) {
  const mats = useMemo(() => getMaterialsSync('medium'), []);
  const { L, w, t } = pieceDims(product);
  if (product.shape === 'board') return <mesh geometry={boardGeometry(L, w, t)} material={pieceMaterials(product, mats, 0)} castShadow receiveShadow />;
  if (product.shape === 'round') return <mesh geometry={poleGeometry(L, w, 24)} material={pieceMaterials(product, mats, 0)} castShadow receiveShadow />;
  if (product.shape === 'bag')
    return <mesh geometry={bagGeometry(L, t, w)} material={(product.dimensions.weightKg ?? 0) <= 6 ? mats.sack5 : mats.sack15} rotation-y={Math.PI / 2} castShadow />;
  return <BulkSample />;
}

function BulkSample() {
  const mats = useMemo(() => getMaterialsSync('medium'), []);
  const lumps = useMemo(() => {
    const out: { p: [number, number, number]; s: number; r: [number, number, number] }[] = [];
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996;
      const rad = 0.08 + Math.sqrt(i) * 0.06;
      out.push({ p: [Math.cos(a) * rad, 0.04 + Math.random() * 0.05, Math.sin(a) * rad], s: 0.03 + Math.random() * 0.04, r: [Math.random() * 3, Math.random() * 3, Math.random() * 3] });
    }
    return out;
  }, []);
  return (
    <group position={[0, -0.1, 0]}>
      <mesh geometry={pileGeometry(0.32, 0.24)} material={mats.charcoal} castShadow />
      {lumps.map((l, i) => (
        <mesh key={i} geometry={lumpGeometry()} material={mats.charcoal} position={l.p} scale={l.s} rotation={l.r} castShadow />
      ))}
    </group>
  );
}

/** Screen-size label drawn into a canvas texture (no DOM → nothing to tear down on unmount). */
function Label({ position, text, delay }: { position: THREE.Vector3; text: string; delay: number }) {
  const { tex, aspect } = useMemo(() => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    const font = '800 56px "Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 36;
    c.width = w;
    c.height = 84;
    ctx.fillStyle = '#f2c879';
    ctx.fillRect(0, 0, w, 84);
    ctx.font = font;
    ctx.fillStyle = '#1c130d';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 18, 45);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, aspect: w / 84 };
  }, [text]);
  const mat = useRef<THREE.SpriteMaterial>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    mat.current.opacity = THREE.MathUtils.clamp((clock.elapsedTime - t0.current - delay) / 0.35, 0, 1);
  });
  const h = 0.05;
  return (
    <sprite position={position} scale={[h * aspect, h, 1]} renderOrder={20}>
      <spriteMaterial ref={mat} map={tex} sizeAttenuation={false} depthTest={false} transparent opacity={0} toneMapped={false} />
    </sprite>
  );
}

/** Measurement line that draws itself from 0 to full length. */
function Dim({ from, to, label, delay, tick, labelAt, color = '#f2c879' }: { from: THREE.Vector3; to: THREE.Vector3; label?: string; delay: number; tick: THREE.Vector3; labelAt?: THREE.Vector3; color?: string }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const dir = useMemo(() => to.clone().sub(from), [from, to]);
  const len = dir.length();
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize()), [dir]);
  const tk = useMemo(() => tick.clone().applyQuaternion(quat.clone().invert()), [tick, quat]);
  useFrame(({ clock }) => {
    if (!g.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const k = THREE.MathUtils.clamp((clock.elapsedTime - t0.current - delay) / 0.7, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    g.current.scale.set(Math.max(e, 0.0001), 1, 1);
  });
  const mid = labelAt ?? from.clone().add(to).multiplyScalar(0.5).add(tick.clone().multiplyScalar(1.6));
  return (
    <>
      <group position={from} quaternion={quat}>
        <group ref={g}>
          <Line points={[[0, 0, 0], [len, 0, 0]]} color={color} lineWidth={1.6} depthTest={false} renderOrder={10} />
        </group>
        {[0, len].map((x) => (
          <Line key={x} points={[[x, -tk.y, -tk.z], [x, tk.y, tk.z]]} color={color} lineWidth={1.6} depthTest={false} renderOrder={10} />
        ))}
      </group>
      {label && <Label position={mid} text={label} delay={delay + 0.35} />}
    </>
  );
}

function Dimensions({ product, lang, mode }: { product: Product; lang: Lang; mode: ViewerMode }) {
  const { L, w, t } = pieceDims(product);
  if (product.shape === 'bag' || product.shape === 'bulk') return null;
  const o = Math.max(w, t) * 0.9 + 0.02;
  const x1 = L / 2;
  const round = product.shape === 'round';
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const sectionText = round ? `Ø ${formatCm(w * 100, lang)}` : `${formatCm(w * 100, lang).replace(/\s?cm$/, '')} × ${formatCm(t * 100, lang)}`;
  // overview: length + one combined section label (separate labels would collide at this zoom)
  if (mode === 'overview')
    return (
      <group key="ov">
        {/* length label sits low near the far third, section label high over the near end: never overlap */}
        <Dim from={V(-L / 2, -t / 2, w / 2 + o)} to={V(L / 2, -t / 2, w / 2 + o)} tick={V(0, 0, o * 0.35)} label={formatLen(L, lang)} labelAt={V(-L * 0.18, -t / 2 - Math.max(0.12, L * 0.03), w / 2 + o * 2)} delay={0.1} />
        <Dim from={V(x1 + o, -t / 2, -w / 2)} to={V(x1 + o, -t / 2, w / 2)} tick={V(o * 0.3, 0, 0)} label={sectionText} labelAt={V(x1 + o, t / 2 + Math.max(0.16, L * 0.045), 0)} delay={0.5} />
      </group>
    );
  return (
    <group key="sec">
      {round ? (
        <Dim from={V(x1 + o * 0.6, -t / 2, 0)} to={V(x1 + o * 0.6, t / 2, 0)} tick={V(o * 0.3, 0, 0)} label={sectionText} delay={0.2} />
      ) : (
        <>
          <Dim from={V(x1 + o * 0.6, -t / 2 - o * 0.4, -w / 2)} to={V(x1 + o * 0.6, -t / 2 - o * 0.4, w / 2)} tick={V(0, o * 0.25, 0)} label={formatCm(w * 100, lang)} labelAt={V(x1 + o * 0.6, -t / 2 - o * 1.3, 0)} delay={0.2} />
          <Dim from={V(x1 + o * 0.6, -t / 2, w / 2 + o * 0.5)} to={V(x1 + o * 0.6, t / 2, w / 2 + o * 0.5)} tick={V(0, 0, o * 0.25)} label={formatCm(t * 100, lang)} labelAt={V(x1 + o * 0.6, 0, w / 2 + o * 1.6)} delay={0.45} />
        </>
      )}
    </group>
  );
}

function Framing({ mode, product }: { mode: ViewerMode; product: Product }) {
  const bounds = useBounds();
  const all = useRef<THREE.Mesh>(null);
  const end = useRef<THREE.Mesh>(null);
  const { L, w, t } = pieceDims(product);
  useEffect(() => {
    const target = mode === 'section' && end.current ? end.current : all.current;
    if (target) bounds.refresh(target).clip().fit();
  }, [mode, bounds, product]);
  const s = Math.max(w, t) * 3.2;
  return (
    <>
      <mesh ref={all} visible={false}>
        <boxGeometry args={[L * 1.05, Math.max(t * 3, 0.1), Math.max(w * 3, 0.1)]} />
      </mesh>
      <mesh ref={end} visible={false} position={[L / 2, 0, w / 2]}>
        <boxGeometry args={[s, s, s]} />
      </mesh>
    </>
  );
}

/** Real-scale product viewer: rotate, zoom, 360° spin, measurements, textures. */
export default function ProductViewer3D({ product, lang, mode, spin }: { product: Product; lang: Lang; mode: ViewerMode; spin: boolean }) {
  const { L, t } = pieceDims(product);
  const floorY = product.shape === 'bulk' ? -0.1 : -t / 2 - 0.004;
  // 3/4 view from one end: the near end shows its section, the board recedes in perspective
  const k = Math.max(L, 0.8);
  const camPos: [number, number, number] = [k * 0.72, k * 0.24, k * 0.62];
  return (
    <Canvas dpr={[1, 2]} shadows camera={{ position: camPos, fov: 32, near: 0.01, far: 100 }} gl={{ antialias: true, alpha: true }}>
      <hemisphereLight args={['#fff4e2', '#5a4128', 0.9]} />
      <directionalLight position={[3, 5, 3]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -2]} intensity={0.6} color="#cfe0ff" />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.4} position={[0, 4, 2]} scale={[6, 3, 1]} />
        <Lightformer intensity={0.5} color="#f2c879" position={[-4, 1, -2]} scale={[4, 2, 1]} />
      </Environment>
      <Bounds fit clip margin={1.15} maxDuration={0.6}>
        <Piece product={product} />
        <Framing mode={mode} product={product} />
      </Bounds>
      <Dimensions product={product} lang={lang} mode={mode} />
      <ContactShadows position={[0, floorY, 0]} opacity={0.45} scale={Math.max(L * 1.6, 2)} blur={2.2} far={1} />
      <OrbitControls makeDefault enablePan={false} autoRotate={spin} autoRotateSpeed={0.9} enableDamping minDistance={0.08} maxDistance={14} />
    </Canvas>
  );
}
