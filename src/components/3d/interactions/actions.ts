import { useCartStore } from '../../../stores/cartStore';
import { useCatalogStore } from '../../../stores/catalogStore';
import { useDepotStore } from '../../../stores/depotStore';
import { useUiStore } from '../../../stores/uiStore';
import { translate } from '../../../i18n';
import { segmentClear, findPath, pathLength } from '../../../utils/depotWorld';
import { ZONES } from '../../../config/depotLayout';
import type { ZoneId } from '../../../types';
import { playerRuntime } from '../runtime';

/** Business actions triggered from the 3D world. Kept outside components so HUD, keyboard and taps share them. */

export function openInspection(interactableId: string, productId: string) {
  const depot = useDepotStore.getState();
  depot.setSelected(interactableId);
  depot.setHovered(null);
  // brief "selected" highlight before the panel slides in — confirms what was picked
  window.setTimeout(() => {
    useDepotStore.getState().setInspecting(interactableId);
    useUiStore.getState().inspect({ productId, placementId: interactableId });
  }, 160);
}

export function openDesk() {
  const ui = useUiStore.getState();
  if (useCartStore.getState().items.length) ui.setCartOpen(true);
  else ui.setQuoteOpen(true);
}

export function interactWith(id: string) {
  const world = playerRuntime.world;
  const it = world?.interactables.find((i) => i.id === id);
  if (!it) return;
  if (it.kind === 'desk') openDesk();
  else if (it.productId) openInspection(it.id, it.productId);
}

/** Line of sight from the camera to a point, through walls/desk/truck only. */
export function hasLineOfSight(x: number, z: number): boolean {
  const w = playerRuntime.world;
  if (!w) return true;
  const occ = w.colliders.filter((c) => c.occludes);
  return segmentClear(playerRuntime.camX, playerRuntime.camZ, x, z, occ);
}

/** Choose the placement of a product closest (by walking distance) to the player. */
export function guideToProduct(productId: string) {
  const world = playerRuntime.world;
  const lang = useUiStore.getState().lang;
  const product = useCatalogStore.getState().byId[productId];
  if (!world || !product) return false;
  const from = { x: playerRuntime.x, z: playerRuntime.z };
  const candidates = world.interactables.filter((i) => i.productId === productId && !i.element);
  const pool = candidates.length ? candidates : world.interactables.filter((i) => i.productId === productId);
  let best: { id: string; access: { x: number; z: number }; d: number } | null = null;
  for (const c of pool) {
    const p = findPath(world.nav, from, c.access);
    if (!p) continue;
    const d = pathLength(p);
    if (!best || d < best.d) best = { id: c.id, access: c.access, d };
  }
  if (!best) return false;
  // the guide banner announces it — no toast on top of it
  useDepotStore.getState().setGuide({ id: best.id, productPlacementId: best.id, label: product.name[lang], point: best.access });
  return true;
}

export function guideToZone(zone: ZoneId) {
  const z = ZONES.find((zz) => zz.id === zone);
  if (!z) return;
  const lang = useUiStore.getState().lang;
  useDepotStore.getState().setGuide({ id: `zone:${zone}`, label: translate(lang, `zone.${zone}` as 'zone.desk'), point: z.anchor });
}
