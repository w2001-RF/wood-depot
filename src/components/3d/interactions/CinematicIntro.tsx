import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PLAYER } from '../../../config/depotLayout';
import { useDepotStore } from '../../../stores/depotStore';
import { prefersReducedMotion } from '../../../utils/webgl';
import { setPose } from '../runtime';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Entrance shot: from the road, over the yard, through the door, ending exactly
 * at the walking pose so control hands over without a jump.
 */
export function CinematicIntro() {
  const { camera } = useThree();
  /** wall-clock start: the shot lasts `duration` seconds even at 5 fps */
  const start = useRef<number | null>(null);
  const duration = useMemo(() => (prefersReducedMotion() ? 1.2 : 5.2), []);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7, 7.5, 30),
        new THREE.Vector3(-3, 4.2, 17),
        new THREE.Vector3(0, 2.3, 6),
        new THREE.Vector3(0, PLAYER.eye, PLAYER.start.z),
      ]),
    [],
  );
  const lookA = useMemo(() => new THREE.Vector3(0, 4, 0), []);
  const lookB = useMemo(() => new THREE.Vector3(0, PLAYER.eye - 0.4, PLAYER.start.z - 10), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const depot = useDepotStore.getState();
    if (depot.phase !== 'cinematic') {
      start.current = null;
      return;
    }
    const now = performance.now() / 1000;
    if (start.current === null) start.current = now;
    const p = Math.min(1, (now - start.current) / duration);
    const k = ease(p);
    camera.position.copy(curve.getPoint(k));
    tmp.lerpVectors(lookA, lookB, Math.min(1, k * 1.15));
    camera.lookAt(tmp);
    if (p >= 1) {
      setPose(PLAYER.start);
      depot.setPhase('explore');
    }
  });
  return null;
}
