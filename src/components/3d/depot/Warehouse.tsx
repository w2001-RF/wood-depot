import { useMemo } from 'react';
import * as THREE from 'three';
import { SITE, WAREHOUSE } from '../../../config/depotLayout';
import { translate } from '../../../i18n';
import type { QualityLevel } from '../../../types';
import type { DepotMaterials } from '../materials/materials';
import { bannerTexture, floorLabelTexture, signTexture } from '../materials/textures';
import { MatrixInstances, SUN_POS, mtx } from './Environment';

const W = WAREHOUSE;
const SLOPE = Math.atan((W.ridge - W.eave) / W.maxX);
const roofY = (x: number) => W.ridge - (Math.abs(x) / W.maxX) * (W.ridge - W.eave);

/** Box with UVs in metres so corrugation and blockwork keep real scale. */
function tiledBox(w: number, h: number, d: number, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    if (ax > 0.5) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
    else if (ay > 0.5) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
    else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
  }
  return g;
}

/** Wall run along X or Z: 1.2 m rendered blockwork, corrugated cladding above. */
function WallRun({ axis, a, b, at, top, bottom = 0, mats, block = true }: { axis: 'x' | 'z'; a: number; b: number; at: number; top: number; bottom?: number; mats: DepotMaterials; block?: boolean }) {
  const len = Math.abs(b - a);
  const mid = (a + b) / 2;
  const blockTop = Math.min(top, 1.2);
  const t = W.wallT;
  const pos = (y: number): [number, number, number] => (axis === 'x' ? [mid, y, at] : [at, y, mid]);
  const dims = (h: number): [number, number, number] => (axis === 'x' ? [len, h, t] : [t, h, len]);
  const blockGeo = useMemo(() => (block && bottom < blockTop ? tiledBox(...dims(blockTop - bottom), 1.6) : null), [len, top, bottom]); // eslint-disable-line react-hooks/exhaustive-deps
  const metalGeo = useMemo(() => (top > blockTop ? tiledBox(...dims(top - Math.max(bottom, blockTop)), 2) : null), [len, top, bottom]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      {blockGeo && <mesh geometry={blockGeo} material={mats.wallBlock} position={pos((bottom + blockTop) / 2)} castShadow receiveShadow />}
      {metalGeo && <mesh geometry={metalGeo} material={mats.wallMetal} position={pos((Math.max(bottom, blockTop) + top) / 2)} castShadow receiveShadow />}
    </group>
  );
}

function Gable({ z, mats }: { z: number; mats: DepotMaterials }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(W.minX, W.eave);
    s.lineTo(0, W.ridge);
    s.lineTo(W.maxX, W.eave);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    const uv = g.attributes.uv;
    const p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
    return g;
  }, []);
  return <mesh geometry={geo} material={mats.wallMetal} position={[0, 0, z - 0.1]} castShadow />;
}

const SKYLIGHTS = new Set(['0:1:1', '0:3:1', '1:1:1']); // hall:bay:strip

function Roof({ mats, quality }: { mats: DepotMaterials; quality: QualityLevel }) {
  const halls = [
    { z0: 0, bays: 4 },
    { z0: -32, bays: 3 },
  ];
  const stripW = W.maxX / 3;
  const panel = useMemo(() => new THREE.BoxGeometry(stripW / Math.cos(SLOPE) + 0.04, 0.05, 4.02), [stripW]);
  const sunDir = useMemo(() => SUN_POS.clone().normalize().negate(), []);
  const panels: { key: string; pos: [number, number, number]; rz: number; sky: boolean }[] = [];
  const shafts: { key: string; from: THREE.Vector3; to: THREE.Vector3 }[] = [];
  halls.forEach((h, hi) => {
    for (let b = 0; b < h.bays; b++) {
      const zc = h.z0 - b * 4 - 2;
      for (const side of [-1, 1])
        for (let s = 0; s < 3; s++) {
          const xc = side * (s * stripW + stripW / 2);
          const sky = SKYLIGHTS.has(`${hi}:${b}:${s}`);
          const y = roofY(xc) + 0.32;
          panels.push({ key: `${hi}-${b}-${side}-${s}`, pos: [xc, y, zc], rz: side * -SLOPE, sky });
          if (sky) {
            const from = new THREE.Vector3(xc, y, zc);
            const to = from.clone().add(sunDir.clone().multiplyScalar(y / -sunDir.y));
            shafts.push({ key: `sh-${hi}-${b}-${side}`, from, to });
          }
        }
    }
  });
  const metal = panels.filter((p) => !p.sky).map((p) => mtx(p.pos, [0, 0, p.rz]));
  const glass = panels.filter((p) => p.sky).map((p) => mtx(p.pos, [0, 0, p.rz]));
  return (
    <group>
      <MatrixInstances geometry={panel} material={mats.roof} matrices={metal} castShadow receiveShadow />
      <MatrixInstances geometry={panel} material={mats.skylight} matrices={glass} />
      {quality !== 'low' && shafts.map((s) => <LightShaft key={s.key} from={s.from} to={s.to} mats={mats} />)}
    </group>
  );
}

/** Additive sun shaft from a skylight to the floor patch it lights. */
function LightShaft({ from, to, mats }: { from: THREE.Vector3; to: THREE.Vector3; mats: DepotMaterials }) {
  const { pos, quat, len } = useMemo(() => {
    const dir = to.clone().sub(from);
    const l = dir.length();
    return {
      pos: from.clone().add(to).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate().normalize()),
      len: l,
    };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} material={mats.shaft} renderOrder={2} raycast={() => null}>
      <cylinderGeometry args={[2.0, 1.7, len, 20, 1, true]} />
    </mesh>
  );
}

function Frames({ mats }: { mats: DepotMaterials }) {
  const rafterLen = W.maxX / Math.cos(SLOPE);
  const matrices = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (const z of W.frames) {
      for (const s of [-1, 1]) {
        out.push(mtx([s * (W.maxX - 0.42), W.eave / 2, z], [0, 0, 0], [0.28, W.eave, 0.32]));
        out.push(mtx([(s * W.maxX) / 2, (W.eave + W.ridge) / 2 + 0.05, z], [0, 0, s * -SLOPE], [rafterLen, 0.42, 0.22]));
      }
    }
    for (const [z0, z1] of [
      [0, -16],
      [-32, -44],
    ])
      for (const s of [-1, 1])
        for (const i of [1, 2]) {
          const x = s * i * (W.maxX / 3);
          out.push(mtx([x, roofY(x) + 0.12, (z0 + z1) / 2], [0, 0, 0], [0.12, 0.18, Math.abs(z1 - z0)]));
        }
    return out;
  }, [rafterLen]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <MatrixInstances geometry={box} material={mats.steel} matrices={matrices} castShadow />;
}

/** Hanging painted-timber sign (both languages, always). */
export function HangingSign({ position, fr, ar, code, accent, width = 3.4, cable = 2.2, rotationY = 0 }: { position: [number, number, number]; fr: string; ar: string; code: string; accent: string; width?: number; cable?: number; rotationY?: number }) {
  const tex = useMemo(() => signTexture(fr, ar, code, accent), [fr, ar, code, accent]);
  const h = width * (300 / 1024);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh castShadow>
        <boxGeometry args={[width + 0.08, h + 0.08, 0.06]} />
        <meshStandardMaterial color="#1a110b" roughness={0.8} />
      </mesh>
      {[0.035, -0.035].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation-y={z < 0 ? Math.PI : 0}>
          <planeGeometry args={[width, h]} />
          <meshStandardMaterial map={tex} roughness={0.7} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
        </mesh>
      ))}
      {[-width / 2 + 0.2, width / 2 - 0.2].map((x) => (
        <mesh key={x} position={[x, h / 2 + cable / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, cable, 4]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function FloorLabel({ code, text, position, size = 3.2 }: { code: string; text: string; position: [number, number, number]; size?: number }) {
  const tex = useMemo(() => floorLabelTexture(code, text), [code, text]);
  return (
    <mesh position={position} rotation-x={-Math.PI / 2} renderOrder={1} raycast={() => null}>
      <planeGeometry args={[size, size / 4]} />
      <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.8} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

function Lamps({ quality }: { quality: QualityLevel }) {
  const spots: [number, number][] = [
    [-7, -6],
    [7, -6],
    [-7, -13],
    [7, -13],
    [-6, -38],
    [6, -38],
  ];
  const lit = quality === 'high' ? spots : quality === 'medium' ? spots.filter((_, i) => i % 2 === 0) : [];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, roofY(x) - 1.6, z]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 1.6, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh>
            <coneGeometry args={[0.38, 0.32, 18, 1, true]} />
            <meshStandardMaterial color="#26332c" side={THREE.DoubleSide} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color="#fff2d6" emissive="#ffd9a0" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {lit.map(([x, z], i) => (
        <pointLight key={i} position={[x, roofY(x) - 2, z]} intensity={22} distance={16} decay={1.6} color="#ffd8a3" />
      ))}
    </group>
  );
}

function Fences({ mats }: { mats: DepotMaterials }) {
  const runs: { axis: 'x' | 'z'; a: number; b: number; at: number }[] = [
    { axis: 'x', a: SITE.minX, b: -5, at: SITE.maxZ },
    { axis: 'x', a: 5, b: SITE.maxX, at: SITE.maxZ },
    { axis: 'z', a: 0, b: SITE.maxZ, at: SITE.minX },
    { axis: 'z', a: 0, b: SITE.maxZ, at: SITE.maxX },
    { axis: 'x', a: SITE.minX, b: W.minX, at: 0 },
    { axis: 'x', a: W.maxX, b: SITE.maxX, at: 0 },
    { axis: 'x', a: -16, b: 16, at: SITE.minZ },
    { axis: 'z', a: SITE.minZ, b: W.minZ, at: -16.1 },
    { axis: 'z', a: SITE.minZ, b: W.minZ, at: 16.1 },
  ];
  return (
    <group>
      {runs.map((r, i) => (
        <WallRun key={i} {...r} top={2.1} mats={mats} />
      ))}
      {/* closed front gate */}
      <group position={[0, 0, SITE.maxZ]}>
        {Array.from({ length: 21 }, (_, i) => (
          <mesh key={i} position={[-5 + i * 0.5, 1.05, 0]} material={mats.paintGreen} castShadow>
            <boxGeometry args={[0.05, 2.1, 0.05]} />
          </mesh>
        ))}
        {[0.25, 1.95].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={mats.paintGreen}>
            <boxGeometry args={[10, 0.08, 0.08]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Warehouse({ mats, quality, businessName, seasonal }: { mats: DepotMaterials; quality: QualityLevel; businessName: string; seasonal: boolean }) {
  const fz = (k: Parameters<typeof translate>[1]) => [translate('fr', k), translate('ar', k)] as const;
  const banner = useMemo(
    () => (seasonal ? bannerTexture(translate('fr', 'seasonal.eid'), translate('ar', 'seasonal.eid')) : bannerTexture(translate('fr', 'seasonal.default'), translate('ar', 'seasonal.default'))),
    [seasonal],
  );
  const [cFr, cAr] = fz('zone.construction');
  const [aFr, aAr] = fz('zone.agriculture');
  const [gFr, gAr] = fz('zone.greenhouse');
  const [chFr, chAr] = fz('zone.charcoal');
  const [lFr, lAr] = fz('zone.loading');
  const doorF = W.frontDoor;
  const doorB = W.backDoor;
  return (
    <group>
      {/* front wall with entrance */}
      <WallRun axis="x" a={W.minX} b={doorF.minX} at={0} top={W.eave} mats={mats} />
      <WallRun axis="x" a={doorF.maxX} b={W.maxX} at={0} top={W.eave} mats={mats} />
      <WallRun axis="x" a={doorF.minX} b={doorF.maxX} at={0} top={W.eave} bottom={doorF.h} mats={mats} block={false} />
      {/* back wall with loading door */}
      <WallRun axis="x" a={W.minX} b={doorB.minX} at={W.minZ} top={W.eave} mats={mats} />
      <WallRun axis="x" a={doorB.maxX} b={W.maxX} at={W.minZ} top={W.eave} mats={mats} />
      <WallRun axis="x" a={doorB.minX} b={doorB.maxX} at={W.minZ} top={W.eave} bottom={doorB.h} mats={mats} block={false} />
      {/* side walls: full height under the roofs, lower around the open courtyard */}
      {[W.minX, W.maxX].map((x) => (
        <group key={x}>
          <WallRun axis="z" a={-16} b={0} at={x} top={W.eave} mats={mats} />
          <WallRun axis="z" a={-32} b={-16} at={x} top={3.2} mats={mats} />
          <WallRun axis="z" a={W.minZ} b={-32} at={x} top={W.eave} mats={mats} />
        </group>
      ))}
      {[0, -16, -32, W.minZ].map((z) => (
        <Gable key={z} z={z} mats={mats} />
      ))}
      <Frames mats={mats} />
      <Roof mats={mats} quality={quality} />
      <Lamps quality={quality} />
      <Fences mats={mats} />

      {/* door frame + facade sign */}
      {[doorF.minX, doorF.maxX].map((x) => (
        <mesh key={x} position={[x, doorF.h / 2, 0.05]} material={mats.paintGreen} castShadow>
          <boxGeometry args={[0.25, doorF.h, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, doorF.h, 0.05]} material={mats.paintGreen}>
        <boxGeometry args={[doorF.maxX - doorF.minX + 0.25, 0.25, 0.4]} />
      </mesh>
      <HangingSign position={[0, 6.35, 0.25]} fr={businessName} ar="مستودع الخشب" code="◆" accent="#1f3a2e" width={5.2} cable={0.01} />

      {/* zone signage inside */}
      <HangingSign position={[0, 5.3, -3]} fr={cFr} ar={cAr} code="A" accent="#8a5a2b" width={3.8} cable={roofY(0) - 5.3} />
      <HangingSign position={[-7.5, 5.0, -15.7]} fr={aFr} ar={aAr} code="B" accent="#556b34" cable={roofY(-7.5) - 5.0} />
      <HangingSign position={[7.5, 5.0, -15.7]} fr={gFr} ar={gAr} code="C" accent="#2f6655" cable={roofY(7.5) - 5.0} />
      <HangingSign position={[-9.5, 5.0, -32.4]} fr={chFr} ar={chAr} code="D" accent="#3a3532" cable={roofY(-9.5) - 5.0} />
      <HangingSign position={[6, 5.0, -32.4]} fr={lFr} ar={lAr} code="E" accent="#6e624f" cable={roofY(6) - 5.0} />

      {/* painted floor markings at each zone entry */}
      <FloorLabel code="A" text={cFr} position={[0, 0.02, -3.2]} />
      <FloorLabel code="B" text={aFr} position={[-8.5, 0.02, -16.6]} />
      <FloorLabel code="C" text={gFr} position={[7.2, 0.02, -16.6]} />
      <FloorLabel code="D" text={chFr} position={[-9.5, 0.02, -32.9]} />
      <FloorLabel code="E" text={lFr} position={[5, 0.02, -32.9]} />

      {/* seasonal campaign banner — content switches with seasonalMode */}
      <mesh position={[W.minX + 0.4, 3.7, -38]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[6.2, 2.33]} />
        <meshStandardMaterial map={banner} roughness={0.85} emissive="#ffffff" emissiveMap={banner} emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}
