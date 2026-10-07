import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PLAYER } from '../../../config/depotLayout';
import { useDepotStore } from '../../../stores/depotStore';
import { selectOverlayOpen, useUiStore } from '../../../stores/uiStore';
import { type DepotWorld, zoneAt } from '../../../utils/depotWorld';
import { distanceToRect, moveWithCollisions } from '../../../utils/geometry2d';
import { prefersReducedMotion } from '../../../utils/webgl';
import { playerRuntime } from '../runtime';
import { interactWith } from './actions';

const KEYMAP: Record<string, 'f' | 'b' | 'l' | 'r'> = {
  KeyW: 'f',
  ArrowUp: 'f',
  KeyS: 'b',
  ArrowDown: 'b',
  KeyA: 'l',
  ArrowLeft: 'l',
  KeyD: 'r',
  ArrowRight: 'r',
};

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/**
 * First-person walking: eye height 1.65 m, eased acceleration, wall sliding,
 * drag-to-look (mouse and touch), joystick, wheel zoom. No pointer lock — it is
 * blocked in many embeds and confuses first-time visitors.
 */
export function PlayerController({ world }: { world: DepotWorld }) {
  const { camera, gl } = useThree();
  const keys = useRef({ f: false, b: false, l: false, r: false, run: false });
  const vel = useRef(new THREE.Vector2());
  const look = useRef({ yaw: playerRuntime.yaw, pitch: playerRuntime.pitch });
  const fov = useRef(68);
  const timers = useRef({ focus: 0, zone: 0, bob: 0 });
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const solid = useMemo(() => world.colliders.filter((c) => c.maxY > 0.25), [world]);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = KEYMAP[e.code];
      const active = useDepotStore.getState().phase === 'explore' && !selectOverlayOpen(useUiStore.getState());
      if (k) {
        keys.current[k] = true;
        if (active && e.code.startsWith('Arrow')) e.preventDefault();
      }
      if (e.key === 'Shift') keys.current.run = true;
      if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && active) {
        const f = useDepotStore.getState().focusedId;
        if (f) {
          e.preventDefault();
          interactWith(f);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code];
      if (k) keys.current[k] = false;
      if (e.key === 'Shift') keys.current.run = false;
    };
    const blur = () => Object.assign(keys.current, { f: false, b: false, l: false, r: false, run: false });
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // drag to look (mouse + touch) and wheel zoom
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    let id: number | null = null;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      if (id !== null) return;
      id = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      if (useDepotStore.getState().phase !== 'explore' || selectOverlayOpen(useUiStore.getState())) return;
      playerRuntime.turnTo = null;
      const s = e.pointerType === 'touch' ? 0.0058 : 0.0034;
      look.current.yaw += (e.clientX - lx) * s;
      look.current.pitch += (e.clientY - ly) * s * 0.85;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch, -1.0, 1.15);
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === id) id = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      fov.current = THREE.MathUtils.clamp(fov.current + e.deltaY * 0.03, 42, 76);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  // adopt poses set from outside (end of intro, skip, QA) — checked every frame,
  // so batched store updates can never leave the controller with a stale view
  const poseSeen = useRef(-1);
  const vel0 = vel;

  useFrame((_, rawDt) => {
    // 100 ms cap: protects against tab-switch spikes without slowing slow devices
    const dt = Math.min(rawDt, playerRuntime.maxDt);
    const depot = useDepotStore.getState();
    if (depot.phase !== 'explore') return;
    const frozen = selectOverlayOpen(useUiStore.getState());
    if (poseSeen.current !== playerRuntime.poseVersion) {
      poseSeen.current = playerRuntime.poseVersion;
      look.current.yaw = playerRuntime.yaw;
      look.current.pitch = playerRuntime.pitch;
      vel0.current.set(0, 0);
    }

    // --- eased turn requested by guidance (arrival): face the product, no snap
    if (playerRuntime.turnTo !== null) {
      let d = playerRuntime.turnTo - look.current.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      look.current.yaw += d * (1 - Math.exp(-5 * dt));
      look.current.pitch += (-0.12 - look.current.pitch) * (1 - Math.exp(-5 * dt));
      if (Math.abs(d) < 0.02) playerRuntime.turnTo = null;
    }

    // --- look: "grab the scene" like Street View — drag right turns the view left
    const k = keys.current;
    playerRuntime.yaw += (look.current.yaw - playerRuntime.yaw) * (1 - Math.exp(-28 * dt));
    playerRuntime.pitch += (look.current.pitch - playerRuntime.pitch) * (1 - Math.exp(-28 * dt));

    // --- move
    let ix = 0;
    let iy = 0;
    if (!frozen) {
      ix = (k.r ? 1 : 0) - (k.l ? 1 : 0) + playerRuntime.joy.x;
      iy = (k.f ? 1 : 0) - (k.b ? 1 : 0) + playerRuntime.joy.y;
    }
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    const joyRun = Math.hypot(playerRuntime.joy.x, playerRuntime.joy.y) > 0.92;
    const speed = k.run || joyRun ? PLAYER.run : PLAYER.walk;
    const sin = Math.sin(playerRuntime.yaw);
    const cos = Math.cos(playerRuntime.yaw);
    // forward = (−sin, −cos), right = (cos, −sin)
    const tx = (-sin * iy + cos * ix) * speed;
    const tz = (-cos * iy - sin * ix) * speed;
    const rate = mag > 0.01 ? 7 : 10; // ease in, settle a bit faster
    const a = 1 - Math.exp(-rate * dt);
    vel.current.x += (tx - vel.current.x) * a;
    vel.current.y += (tz - vel.current.y) * a;
    if (Math.abs(vel.current.x) < 0.001) vel.current.x = 0;
    if (Math.abs(vel.current.y) < 0.001) vel.current.y = 0;

    const res = moveWithCollisions(playerRuntime.x, playerRuntime.z, vel.current.x * dt, vel.current.y * dt, PLAYER.radius, solid);
    const moved = Math.hypot(res.x - playerRuntime.x, res.z - playerRuntime.z);
    playerRuntime.x = res.x;
    playerRuntime.z = res.z;
    playerRuntime.speed = moved / Math.max(dt, 1e-4);
    if (res.hit) {
      // bleed off velocity into the wall so sliding does not feel sticky
      vel.current.multiplyScalar(0.92);
    }

    // --- camera: eye height + very small step cadence (off with reduced motion)
    const sp = Math.min(playerRuntime.speed / PLAYER.walk, 1.6);
    timers.current.bob += dt * (6.5 + sp * 2.2) * (sp > 0.05 ? 1 : 0);
    const bob = reduced ? 0 : Math.sin(timers.current.bob * 2) * 0.012 * sp;
    camera.position.set(playerRuntime.x, PLAYER.eye + bob, playerRuntime.z);
    camera.rotation.set(playerRuntime.pitch, playerRuntime.yaw, 0, 'YXZ');
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov.current) > 0.05) {
      cam.fov += (fov.current - cam.fov) * (1 - Math.exp(-10 * dt));
      cam.updateProjectionMatrix();
    }
    playerRuntime.camX = camera.position.x;
    playerRuntime.camZ = camera.position.z;
    playerRuntime.camY = camera.position.y;

    // --- HUD interact button (mobile)
    if (playerRuntime.interactRequested) {
      playerRuntime.interactRequested = false;
      if (depot.focusedId && !frozen) interactWith(depot.focusedId);
    }

    // --- proximity focus: nearest interactable in front of the visitor
    timers.current.focus -= dt;
    if (timers.current.focus <= 0) {
      timers.current.focus = 0.1;
      let best: string | null = null;
      let bestScore = Infinity;
      const fx = -sin;
      const fz = -cos;
      for (const it of world.interactables) {
        const d = distanceToRect(playerRuntime.x, playerRuntime.z, it.bounds);
        const reach = it.element ? 1.9 : PLAYER.nearDist;
        if (d > reach) continue;
        // aim at the closest point of the pile, not its centre (long stacks)
        const cx = THREE.MathUtils.clamp(playerRuntime.x, it.bounds.minX, it.bounds.maxX);
        const cz = THREE.MathUtils.clamp(playerRuntime.z, it.bounds.minZ, it.bounds.maxZ);
        let dx = (d < 0.05 ? it.center[0] : cx) - playerRuntime.x;
        let dz = (d < 0.05 ? it.center[2] : cz) - playerRuntime.z;
        const n = Math.hypot(dx, dz) || 1;
        dx /= n;
        dz /= n;
        const dot = dx * fx + dz * fz;
        if (dot < 0.25 && d > 0.7) continue;
        const score = d - dot * 1.2 + (it.element ? 0.3 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = it.id;
        }
      }
      depot.setFocused(frozen ? null : best);
    }

    timers.current.zone -= dt;
    if (timers.current.zone <= 0) {
      timers.current.zone = 0.3;
      depot.setCurrentZone(zoneAt(playerRuntime.x, playerRuntime.z));
    }
  });

  return null;
}
