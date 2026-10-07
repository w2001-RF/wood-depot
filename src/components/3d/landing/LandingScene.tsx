import { Sky, Sparkles } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { WAREHOUSE } from '../../../config/depotLayout';
import { useCatalogStore } from '../../../stores/catalogStore';
import { prefersReducedMotion } from '../../../utils/webgl';
import { SUN_POS, tiledPlane } from '../depot/Environment';
import { HangingSign } from '../depot/Warehouse';
import { getMaterialsSync, type DepotMaterials } from '../materials/materials';
import { ProductStack } from '../products/ProductStack';

const W = WAREHOUSE;

function Facade({ mats }: { mats: DepotMaterials }) {
  const wall = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(W.minX, 0);
    s.lineTo(W.maxX, 0);
    s.lineTo(W.maxX, W.eave);
    s.lineTo(0, W.ridge);
    s.lineTo(W.minX, W.eave);
    s.closePath();
    const hole = new THREE.Path();
    hole.moveTo(W.frontDoor.minX, 0);
    hole.lineTo(W.frontDoor.minX, W.frontDoor.h);
    hole.lineTo(W.frontDoor.maxX, W.frontDoor.h);
    hole.lineTo(W.frontDoor.maxX, 0);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
    const uv = g.attributes.uv;
    const p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
    return g;
  }, []);
  const name = useCatalogStore((s) => s.settings.businessName);
  return (
    <group>
      <mesh geometry={wall} material={mats.wallMetal} position={[0, 0, -0.3]} castShadow receiveShadow />
      {/* side walls + roof hint */}
      {[W.minX, W.maxX].map((x) => (
        <mesh key={x} position={[x, W.eave / 2, -12]} material={mats.wallMetal} castShadow receiveShadow>
          <boxGeometry args={[0.3, W.eave, 24]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W.maxX) / 2, (W.eave + W.ridge) / 2 + 0.1, -12]} rotation-z={s * -Math.atan(2.5 / 15)} material={mats.roof} castShadow>
          <boxGeometry args={[15.3, 0.06, 24.4]} />
        </mesh>
      ))}
      {/* warm interior glimpse through the door */}
      <mesh position={[0, 0.01, -8]} rotation-x={-Math.PI / 2} material={mats.concrete}>
        <planeGeometry args={[30, 16]} />
      </mesh>
      <pointLight position={[0, 4, -6]} intensity={40} distance={20} color="#ffcf8f" />
      {[-1, 1].map((s) => (
        <mesh key={`df${s}`} position={[s * 3.2, W.frontDoor.h / 2, 0.05]} material={mats.paintGreen}>
          <boxGeometry args={[0.25, W.frontDoor.h, 0.4]} />
        </mesh>
      ))}
      <HangingSign position={[0, 6.35, 0.25]} fr={name} ar="مستودع الخشب" code="◆" accent="#1f3a2e" width={5.2} cable={0.01} />
    </group>
  );
}

function CameraDrift() {
  const { camera } = useThree();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const target = useMemo(() => new THREE.Vector3(0, 3.2, -4), []);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const a = Math.sin(t * 0.07) * 0.5;
    camera.position.set(Math.sin(a) * 26, 4.2 + Math.sin(t * 0.11) * 0.6, 22 + Math.cos(a) * 6);
    camera.lookAt(target);
  });
  return null;
}

function Scene() {
  const mats = useMemo(() => getMaterialsSync('medium'), []);
  const byId = useCatalogStore((s) => s.byId);
  const ground = useMemo(() => tiledPlane(200, 200, 9), []);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, 0);
    return o;
  }, []);
  return (
    <>
      <hemisphereLight args={['#ffe9c8', '#7a5c3c', 0.8]} />
      <primitive object={target} />
      <directionalLight position={SUN_POS.toArray()} target={target} intensity={3} color="#ffe2b8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004} />
      <Sky sunPosition={[SUN_POS.x, 12, SUN_POS.z]} turbidity={8} rayleigh={1.6} mieCoefficient={0.008} />
      <fog attach="fog" args={['#e2c9a2', 35, 120]} />
      <mesh geometry={ground} material={mats.ground} receiveShadow />
      <Facade mats={mats} />
      {byId['bois-charpente'] && (
        <group position={[-10, 0, 8]}>
          <ProductStack product={byId['bois-charpente']} mats={mats} quality="medium" seed={4} />
        </group>
      )}
      {byId['madrier'] && (
        <group position={[-9.5, 0, 11.5]} rotation-y={0.08}>
          <ProductStack product={byId['madrier']} mats={mats} quality="medium" seed={7} />
        </group>
      )}
      {byId['poteau-agricole'] && (
        <group position={[10.5, 0, 8.5]} rotation-y={-0.1}>
          <ProductStack product={byId['poteau-agricole']} mats={mats} quality="medium" seed={9} />
        </group>
      )}
      {byId['planche'] && (
        <group position={[0, 0, -6]}>
          <ProductStack product={byId['planche']} mats={mats} quality="medium" seed={2} />
        </group>
      )}
      <Sparkles count={50} scale={[30, 8, 20]} position={[0, 4, 6]} size={2} speed={0.15} opacity={0.4} color="#fff0d0" />
      <CameraDrift />
    </>
  );
}

/** Cinematic exterior for the home hero — light enough to load first. */
export default function LandingScene({ active }: { active: boolean }) {
  return (
    <Canvas className="!absolute inset-0" shadows="soft" dpr={[1, 1.5]} frameloop={active ? 'always' : 'never'} camera={{ fov: 42, position: [0, 4, 26], near: 0.1, far: 400 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Scene />
    </Canvas>
  );
}
