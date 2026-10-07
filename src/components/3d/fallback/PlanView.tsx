import { useMemo } from 'react';
import { GREENHOUSE, PROPS, PROP_FOOTPRINT, SITE, WAREHOUSE, ZONES } from '../../../config/depotLayout';
import { useT } from '../../../i18n';
import { useCatalogStore } from '../../../stores/catalogStore';
import { useDepotStore } from '../../../stores/depotStore';
import { useUiStore } from '../../../stores/uiStore';
import type { DepotWorld } from '../../../utils/depotWorld';
import { rotatedFootprint } from '../../../utils/geometry2d';
import { TONES } from '../materials/textures';
import { playerRuntime } from '../runtime';

const S = 14;
const K = 0.62; // depth foreshortening
const HY = 0.9; // height factor
const px = (x: number) => (x - SITE.minX) * S;
const pz = (z: number) => (z - SITE.minZ) * S * K;

/** Oblique box: top face + front face. Entrance at the bottom, like the minimap. */
function Box({ minX, maxX, minZ, maxZ, h, top, front, stroke = 'rgba(28,19,13,0.35)' }: { minX: number; maxX: number; minZ: number; maxZ: number; h: number; top: string; front: string; stroke?: string }) {
  const lift = h * S * HY;
  const x0 = px(minX);
  const x1 = px(maxX);
  const z0 = pz(minZ) - lift;
  const z1 = pz(maxZ) - lift;
  return (
    <g>
      <rect x={x0} y={z1} width={x1 - x0} height={lift} fill={front} stroke={stroke} strokeWidth={0.6} />
      <rect x={x0} y={z0} width={x1 - x0} height={z1 - z0} fill={top} stroke={stroke} strokeWidth={0.6} />
    </g>
  );
}

/**
 * Non-WebGL depot: same layout, same products, same inspection and cart flow.
 * Also reachable on purpose through the "Vue plan" toggle.
 */
export function PlanView({ world }: { world: DepotWorld }) {
  const { t, l } = useT();
  const byId = useCatalogStore((s) => s.byId);
  const inspect = useUiStore((s) => s.inspect);
  const guide = useDepotStore((s) => s.guide);
  const notice = useDepotStore((s) => s.notice);
  const W = (SITE.maxX - SITE.minX) * S;
  const Hh = (SITE.maxZ - SITE.minZ) * S * K + 40;
  const ordered = useMemo(() => [...world.placements].sort((a, b) => a.footprint.minZ - b.footprint.minZ), [world]);
  const zonesWithProducts = useMemo(
    () =>
      ZONES.filter((z) => z.onMap)
        .map((z) => ({ z, items: world.placements.filter((p) => p.zone === z.id) }))
        .filter((g) => g.items.length),
    [world],
  );
  const open = (id: string, productId: string) => inspect({ productId, placementId: id });

  return (
    <div className="absolute inset-0 overflow-auto bg-[#efe6d4] pb-28 pt-20 text-[#1c130d]">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="font-display text-3xl font-black uppercase tracking-wide">{t('depot.isoTitle')}</h1>
        <p className="mt-1 text-sm text-[#6b4428]">{notice ?? t('depot.isoHint')}</p>
        <div className="mt-4 border border-[#3a2618]/15 bg-[#e3d6bd]">
          <svg viewBox={`0 -30 ${W} ${Hh}`} className="h-auto w-full" role="img" aria-label={t('depot.isoTitle')}>
            <rect x={0} y={0} width={W} height={(SITE.maxZ - SITE.minZ) * S * K} fill="#d8c6a6" />
            <rect x={px(WAREHOUSE.minX)} y={pz(WAREHOUSE.minZ)} width={30 * S} height={44 * S * K} fill="#c9c0b1" />
            {ZONES.filter((z) => z.onMap && z.id !== 'desk').map((z) => (
              <g key={z.id}>
                <rect x={px(z.rect.minX)} y={pz(z.rect.minZ)} width={(z.rect.maxX - z.rect.minX) * S} height={(z.rect.maxZ - z.rect.minZ) * S * K} fill={z.color} opacity={0.22} />
                <text x={px(z.rect.minX) + 8} y={pz(z.rect.maxZ) - 8} className="font-display" fontSize={15} fontWeight={800} fill="#3a2618">
                  {z.code} · {t(`zone.${z.id}` as 'zone.desk').toUpperCase()}
                </text>
              </g>
            ))}
            <Box minX={GREENHOUSE.minX} maxX={GREENHOUSE.maxX} minZ={GREENHOUSE.minZ} maxZ={GREENHOUSE.maxZ} h={2.4} top="rgba(240,246,240,0.55)" front="rgba(220,235,225,0.45)" stroke="#4f8a76" />
            {PROPS.map((p) => {
              const f = PROP_FOOTPRINT[p.kind];
              const r = rotatedFootprint(p.x, p.z, f.length, f.depth, p.rotY);
              const color = p.kind === 'desk' ? ['#d6b24a', '#a8862a'] : p.kind === 'truck' ? ['#ece6da', '#c9c2b4'] : p.kind === 'forklift' ? ['#d9a835', '#a88021'] : ['#d4c1a0', '#b19c78'];
              return <Box key={p.id} {...r} h={p.kind === 'pallets' ? (p.count ?? 1) * 0.144 : Math.min(f.height, 2.5)} top={color[0]} front={color[1]} />;
            })}
            {ordered.map((pl) => {
              const prod = byId[pl.productId];
              if (!prod) return null;
              const tone = TONES[prod.woodTone];
              const guided = guide?.productPlacementId === pl.id;
              const f = pl.footprint;
              return (
                <g
                  key={pl.id}
                  role="button"
                  tabIndex={0}
                  aria-label={l(prod.name)}
                  className="cursor-pointer outline-none [&:focus-visible>g]:opacity-80 [&:hover>g]:opacity-80"
                  onClick={() => open(pl.id, prod.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(pl.id, prod.id)}
                >
                  <Box {...f} h={pl.spec.height} top={tone.light} front={tone.dark} stroke={guided ? '#c47f00' : undefined} />
                  {guided && <rect x={px(f.minX) - 4} y={pz(f.minZ) - pl.spec.height * S * HY - 4} width={(f.maxX - f.minX) * S + 8} height={(f.maxZ - f.minZ) * S * K + pl.spec.height * S * HY + 8} fill="none" stroke="#f2a900" strokeWidth={3} className="wd-pulse" />}
                </g>
              );
            })}
            {/* walls drawn last, low, so they never hide stock */}
            {world.colliders
              .filter((c) => c.id.startsWith('wall'))
              .map((c) => (
                <rect key={c.id} x={px(c.minX)} y={pz(c.minZ)} width={Math.max(2, (c.maxX - c.minX) * S)} height={Math.max(2, (c.maxZ - c.minZ) * S * K)} fill="#3a2618" />
              ))}
            <g transform={`translate(${px(playerRuntime.x)} ${pz(playerRuntime.z)})`}>
              <circle r={7} fill="#1f3a2e" stroke="#f6f1e7" strokeWidth={2} />
              <text y={-12} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1f3a2e">
                {t('depot.youAreHere')}
              </text>
            </g>
          </svg>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {zonesWithProducts.map(({ z, items }) => (
            <section key={z.id} className="border border-[#3a2618]/15 bg-[#f6f1e7] p-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold uppercase">
                <span className="grid h-6 w-6 place-items-center text-xs text-white" style={{ background: z.color }}>
                  {z.code}
                </span>
                {t(`zone.${z.id}` as 'zone.desk')}
              </h2>
              <ul className="mt-2 divide-y divide-[#3a2618]/10">
                {items.map((pl) => {
                  const prod = byId[pl.productId];
                  return prod ? (
                    <li key={pl.id}>
                      <button type="button" onClick={() => open(pl.id, prod.id)} className="flex w-full items-center justify-between py-2 text-start text-sm hover:text-[#2f5a45]">
                        {l(prod.name)}
                        <span aria-hidden>→</span>
                      </button>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
