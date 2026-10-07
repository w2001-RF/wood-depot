import { Maximize2, Minimize2, Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GREENHOUSE, SITE, WAREHOUSE, ZONES, type ZoneDef } from '../../../config/depotLayout';
import { useT } from '../../../i18n';
import { useDepotStore } from '../../../stores/depotStore';
import type { ZoneId } from '../../../types';
import type { DepotWorld } from '../../../utils/depotWorld';
import { guideToZone } from '../interactions/actions';
import { playerRuntime } from '../runtime';

interface View {
  cx: number;
  cz: number;
  rot: number;
  s: number;
  w: number;
  h: number;
}

function toWorld(v: View, mx: number, my: number) {
  const dx = mx - v.w / 2;
  const dy = my - v.h / 2;
  const c = Math.cos(-v.rot);
  const s = Math.sin(-v.rot);
  return { x: (dx * c - dy * s) / v.s + v.cx, z: (dx * s + dy * c) / v.s + v.cz };
}

function draw(ctx: CanvasRenderingContext2D, v: View, world: DepotWorld, labels: Record<string, string>, expanded: boolean) {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, v.w, v.h);
  ctx.fillStyle = 'rgba(28,19,13,0.82)';
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.save();
  ctx.translate(v.w / 2, v.h / 2);
  ctx.rotate(v.rot);
  ctx.scale(v.s, v.s);
  ctx.translate(-v.cx, -v.cz);
  const px = 1 / v.s;
  // site + building
  ctx.fillStyle = 'rgba(184,154,114,0.18)';
  ctx.fillRect(SITE.minX, SITE.minZ, SITE.maxX - SITE.minX, SITE.maxZ - SITE.minZ);
  ctx.fillStyle = 'rgba(164,156,144,0.28)';
  ctx.fillRect(WAREHOUSE.minX, WAREHOUSE.minZ, 30, 44);
  for (const z of ZONES) {
    if (!z.onMap || z.id === 'desk') continue;
    ctx.fillStyle = `${z.color}55`;
    ctx.fillRect(z.rect.minX, z.rect.minZ, z.rect.maxX - z.rect.minX, z.rect.maxZ - z.rect.minZ);
  }
  // stock piles & obstacles
  for (const c of world.colliders) {
    if (c.id.startsWith('wall') || c.id.startsWith('fence')) continue;
    ctx.fillStyle = c.id.startsWith('pl-') ? 'rgba(217,170,110,0.95)' : c.id === 'desk' ? '#c9a227' : 'rgba(236,223,200,0.35)';
    ctx.fillRect(c.minX, c.minZ, c.maxX - c.minX, c.maxZ - c.minZ);
  }
  ctx.strokeStyle = 'rgba(111,170,140,0.9)';
  ctx.lineWidth = 1.5 * px;
  ctx.strokeRect(GREENHOUSE.minX, GREENHOUSE.minZ, GREENHOUSE.maxX - GREENHOUSE.minX, GREENHOUSE.maxZ - GREENHOUSE.minZ);
  // walls
  ctx.fillStyle = '#ecdfc8';
  for (const c of world.colliders) if (c.id.startsWith('wall')) ctx.fillRect(c.minX, c.minZ, c.maxX - c.minX, c.maxZ - c.minZ);
  // guidance
  const path = playerRuntime.path;
  const g = useDepotStore.getState().guide;
  if (g && path.length > 1) {
    ctx.strokeStyle = '#f2c879';
    ctx.lineWidth = 2.5 * px;
    ctx.setLineDash([4 * px, 3 * px]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].z);
    for (const p of path) ctx.lineTo(p.x, p.z);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (g) {
    ctx.strokeStyle = '#f2c879';
    ctx.lineWidth = 2 * px;
    ctx.beginPath();
    ctx.arc(g.point.x, g.point.z, 1.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // labels (kept upright)
  ctx.font = `700 ${expanded ? 12 : 10}px "Instrument Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const z of ZONES) {
    if (!z.onMap) continue;
    const cxz = z.id === 'desk' ? { x: z.rect.minX + 2, z: z.rect.minZ + 2 } : { x: (z.rect.minX + z.rect.maxX) / 2, z: (z.rect.minZ + z.rect.maxZ) / 2 };
    ctx.save();
    ctx.translate(cxz.x, cxz.z);
    ctx.scale(px, px);
    ctx.rotate(-v.rot);
    const text = expanded ? `${z.code} · ${labels[z.id]}` : z.code;
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(28,19,13,0.75)';
    ctx.fillRect(-tw / 2, -9, tw, 18);
    ctx.fillStyle = '#f6f1e7';
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }
  // player arrow
  ctx.save();
  ctx.translate(playerRuntime.x, playerRuntime.z);
  ctx.rotate(-playerRuntime.yaw);
  ctx.scale(px, px);
  ctx.fillStyle = 'rgba(242,200,121,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 34, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6f1e7';
  ctx.strokeStyle = '#1c130d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6.5, 7);
  ctx.lineTo(0, 3.5);
  ctx.lineTo(-6.5, 7);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/**
 * Compact: heading-up, centred on the visitor (natural when walking).
 * Expanded: the whole plan, entrance at the bottom, with a zone list.
 */
export function Minimap({ world, compact = false }: { world: DepotWorld; compact?: boolean }) {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [pick, setPick] = useState<{ zone: ZoneDef; x: number; y: number } | null>(null);
  const view = useRef<View>({ cx: 0, cz: 0, rot: 0, s: 3, w: 180, h: 180 });
  const labels = Object.fromEntries(ZONES.map((z) => [z.id, t(`zone.${z.id}` as 'zone.desk')]));
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 50) return; // 20 fps is plenty for a map
      last = ts;
      const c = ref.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(rect.width * dpr)) {
        c.width = Math.round(rect.width * dpr);
        c.height = Math.round(rect.height * dpr);
      }
      const v = view.current;
      v.w = rect.width;
      v.h = rect.height;
      if (expanded) {
        v.cx = 0;
        v.cz = (SITE.minZ + SITE.maxZ) / 2;
        v.rot = 0;
        v.s = Math.min(v.w / (SITE.maxX - SITE.minX + 4), v.h / (SITE.maxZ - SITE.minZ + 4));
      } else {
        v.cx = playerRuntime.x;
        v.cz = playerRuntime.z;
        v.rot = playerRuntime.yaw;
        v.s = compact ? 2.6 : 3.4;
      }
      draw(c.getContext('2d')!, v, world, labelsRef.current, expanded);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world, expanded, compact]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const p = toWorld(view.current, mx, my);
    const zone = ZONES.find((z) => z.onMap && p.x >= z.rect.minX && p.x <= z.rect.maxX && p.z >= z.rect.minZ && p.z <= z.rect.maxZ && z.id !== 'desk') ?? null;
    const desk = ZONES.find((z) => z.id === 'desk')!;
    const onDesk = p.x >= desk.rect.minX - 1 && p.x <= desk.rect.maxX && p.z >= desk.rect.minZ - 1 && p.z <= desk.rect.maxZ + 1;
    const hit = onDesk ? desk : zone;
    setPick(hit ? { zone: hit, x: mx, y: my } : null);
  };

  const go = (id: ZoneId) => {
    guideToZone(id);
    setPick(null);
    setExpanded(false);
  };

  return (
    <div className={`wd-glass pointer-events-auto relative overflow-hidden transition-all duration-300 ${expanded ? 'h-[min(78vh,620px)] w-[min(92vw,360px)]' : compact ? 'h-[112px] w-[112px]' : 'h-[150px] w-[150px] sm:h-[176px] sm:w-[176px]'}`}>
      <canvas ref={ref} className="h-full w-full cursor-pointer" onClick={onClick} aria-label={t('depot.minimap')} role="img" />
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          setPick(null);
        }}
        className="absolute end-1.5 top-1.5 grid h-8 w-8 place-items-center bg-[#1c130d]/80 text-[#f6f1e7] hover:bg-[#1c130d]"
        aria-label={t('depot.expandMap')}
      >
        {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
      {pick && (
        <div className="absolute z-10 -translate-x-1/2 -translate-y-full" style={{ left: Math.min(Math.max(pick.x, 80), view.current.w - 80), top: Math.max(pick.y, 64) }}>
          <button type="button" onClick={() => go(pick.zone.id)} className="flex items-center gap-1.5 whitespace-nowrap bg-[#f2c879] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#1c130d] shadow-lg">
            <Navigation size={13} />
            {t('depot.goToZone')} · {pick.zone.code}
          </button>
        </div>
      )}
      {expanded && (
        <ul className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-px bg-[#1c130d]/90 p-px text-xs">
          {ZONES.filter((z) => z.onMap).map((z) => (
            <li key={z.id}>
              <button type="button" onClick={() => go(z.id)} className="flex w-full items-center gap-2 bg-[#1c130d] px-2.5 py-2 text-start text-[#ecdfc8] hover:bg-[#3a2618]">
                <span className="grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold text-[#1c130d]" style={{ background: z.color === '#4a4440' ? '#8d8580' : z.color }}>
                  {z.code}
                </span>
                <span className="truncate">{labels[z.id]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
