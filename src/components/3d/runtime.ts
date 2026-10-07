import type { DepotWorld } from '../../utils/depotWorld';
import { PLAYER } from '../../config/depotLayout';

/**
 * Per-frame mutable state shared between the canvas, the DOM joystick and the
 * minimap. Kept out of React/Zustand on purpose: it changes 60× per second.
 */
export const playerRuntime = {
  x: PLAYER.start.x,
  z: PLAYER.start.z,
  yaw: PLAYER.start.yaw,
  pitch: PLAYER.start.pitch,
  speed: 0,
  /** joystick: x = strafe (right +), y = forward (+), magnitude ≤ 1 */
  joy: { x: 0, y: 0 },
  /** accumulated look delta from touch swipes (radians) */
  lookDX: 0,
  lookDY: 0,
  /** camera position for occlusion checks */
  camX: 0,
  camY: PLAYER.eye,
  camZ: 0,
  /** guidance path for minimap */
  path: [] as { x: number; z: number }[],
  /** one-shot command from the HUD ("interact" button) */
  interactRequested: false,
  world: null as DepotWorld | null,
  /** frame delta cap (QA can raise it on software renderers) */
  maxDt: 0.1,
  /** bumped whenever the pose is set from outside the controller */
  poseVersion: 0,
  /** eased turn request (e.g. face the product on arrival) */
  turnTo: null as number | null,
};

/** Place the visitor (cinematic hand-off, "return to entrance", QA). The controller adopts it next frame. */
export function setPose(p: { x: number; z: number; yaw: number; pitch?: number }) {
  playerRuntime.x = p.x;
  playerRuntime.z = p.z;
  playerRuntime.yaw = p.yaw;
  playerRuntime.pitch = p.pitch ?? 0;
  playerRuntime.speed = 0;
  playerRuntime.poseVersion++;
}

export function resetPlayer() {
  setPose(PLAYER.start);
}
