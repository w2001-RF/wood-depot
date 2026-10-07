import { ArrowLeft, ArrowRight, BrickWall, Check, House, RotateCcw, ShoppingCart, Sprout, Tractor, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useT, type TKey } from '../../i18n';
import { estimate, type ConfigInput } from '../../services/configurator';
import { unitLabel } from '../../services/whatsapp';
import { useCartStore } from '../../stores/cartStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { useUiStore } from '../../stores/uiStore';
import { formatDims } from '../../utils/format';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

type Kind = ConfigInput['type'];

type Step =
  | { kind: 'num'; key: string; label: TKey; unit: string; min: number; max: number; step: number }
  | { kind: 'choice'; key: string; label: TKey; options: { v: string; label: TKey }[] };

const STEPS: Record<Kind, Step[]> = {
  greenhouse: [
    { kind: 'num', key: 'lengthM', label: 'config.length', unit: 'm', min: 4, max: 100, step: 1 },
    { kind: 'num', key: 'widthM', label: 'config.width', unit: 'm', min: 3, max: 12, step: 0.5 },
    { kind: 'num', key: 'heightM', label: 'config.height', unit: 'm', min: 2, max: 5, step: 0.5 },
    { kind: 'choice', key: 'usage', label: 'config.usage', options: [{ v: 'vegetables', label: 'config.vegetables' }, { v: 'nursery', label: 'config.nursery' }, { v: 'berries', label: 'config.berries' }] },
  ],
  formwork: [
    { kind: 'choice', key: 'element', label: 'config.element', options: [{ v: 'slab', label: 'config.slab' }, { v: 'wall', label: 'config.wall' }] },
    { kind: 'num', key: 'areaM2', label: 'config.area', unit: 'm²', min: 2, max: 500, step: 1 },
  ],
  construction: [
    { kind: 'num', key: 'lengthM', label: 'config.length', unit: 'm', min: 3, max: 40, step: 0.5 },
    { kind: 'num', key: 'widthM', label: 'config.width', unit: 'm', min: 3, max: 20, step: 0.5 },
    { kind: 'choice', key: 'roof', label: 'config.roof', options: [{ v: 'pitched', label: 'config.roofPitched' }, { v: 'flat', label: 'config.roofFlat' }] },
  ],
  agriculture: [
    { kind: 'choice', key: 'system', label: 'config.system', options: [{ v: 'trellis', label: 'config.trellis' }, { v: 'fence', label: 'config.fence' }] },
    { kind: 'num', key: 'rowLengthM', label: 'config.rowLength', unit: 'm', min: 5, max: 300, step: 5 },
    { kind: 'num', key: 'rows', label: 'config.rows', unit: '', min: 1, max: 60, step: 1 },
    { kind: 'num', key: 'spacingM', label: 'config.spacing', unit: 'm', min: 2, max: 6, step: 0.5 },
  ],
};

const DEFAULTS: Record<Kind, Record<string, string | number>> = {
  greenhouse: { lengthM: 10, widthM: 5, heightM: 3, usage: 'vegetables' },
  formwork: { element: 'slab', areaM2: 40 },
  construction: { lengthM: 8, widthM: 6, roof: 'pitched' },
  agriculture: { system: 'trellis', rowLengthM: 50, rows: 4, spacingM: 3 },
};

const TYPES: { k: Kind; icon: typeof House; label: TKey }[] = [
  { k: 'construction', icon: House, label: 'project.construction' },
  { k: 'greenhouse', icon: Sprout, label: 'project.greenhouse' },
  { k: 'formwork', icon: BrickWall, label: 'project.formwork' },
  { k: 'agriculture', icon: Tractor, label: 'project.agriculture' },
];

/** Live sketch of the greenhouse so the numbers mean something. */
function GreenhouseSketch({ L, W, H }: { L: number; W: number; H: number }) {
  const s = Math.min(240 / Math.max(L, 1), 120 / Math.max(W, 1), 30);
  const frames = Math.ceil(L / 2) + 1;
  return (
    <svg viewBox="0 0 320 200" className="h-40 w-full" aria-hidden>
      <rect width="320" height="200" fill="#efe6d4" />
      <g transform="translate(40 30)">
        {Array.from({ length: Math.min(frames, 40) }, (_, i) => {
          const x = (i / Math.max(frames - 1, 1)) * L * s;
          return (
            <g key={i} transform={`translate(${x * 0.95} ${-x * 0.18})`}>
              <path d={`M0 ${120} V${120 - H * 14} L${(W * s) / 2} ${120 - H * 14 - 18} L${W * s} ${120 - H * 14} V120`} fill="none" stroke="#ad7a52" strokeWidth="2" />
            </g>
          );
        })}
      </g>
      <text x="300" y="190" textAnchor="end" fontSize="11" fill="#6b4428">
        {L} × {W} × {H} m
      </text>
    </svg>
  );
}

export function ProjectConfigurator() {
  const { t, l, lang } = useT();
  const byId = useCatalogStore((s) => s.byId);
  const addMany = useCartStore((s) => s.addMany);
  const toast = useUiStore((s) => s.toast);
  const setQuoteOpen = useUiStore((s) => s.setQuoteOpen);
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(DEFAULTS);
  const [added, setAdded] = useState(false);

  const steps = kind ? STEPS[kind] : [];
  const showResult = kind && step >= steps.length;
  const lines = useMemo(() => (kind ? estimate({ type: kind, ...values[kind] } as ConfigInput) : []), [kind, values]);
  const v = kind ? values[kind] : {};
  const setVal = (key: string, val: string | number) => {
    if (!kind) return;
    setValues((s) => ({ ...s, [kind]: { ...s[kind], [key]: val } }));
    setAdded(false);
  };

  if (!kind)
    return (
      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">{t('config.choose')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((ty) => (
            <button
              key={ty.k}
              type="button"
              onClick={() => {
                setKind(ty.k);
                setStep(0);
                setAdded(false);
              }}
              className="group flex h-40 flex-col justify-between border border-[#3a2618]/15 bg-[#fbf8f2] p-5 text-start transition hover:border-[#1c130d] hover:bg-[#efe6d4]"
            >
              <ty.icon size={30} className="text-[#6b4428] transition group-hover:text-[#1c130d]" />
              <span className="font-display text-2xl font-extrabold uppercase">{t(ty.label)}</span>
            </button>
          ))}
        </div>
      </div>
    );

  const cur = steps[step];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="border border-[#3a2618]/15 bg-[#fbf8f2] p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => (step === 0 ? setKind(null) : setStep(step - 1))} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
            <ArrowLeft size={14} className="rtl:rotate-180" /> {t('cta.back')}
          </button>
          <span className="text-xs text-[#6b4428]">{showResult ? t('config.result') : t('config.step', { n: step + 1, total: steps.length })}</span>
        </div>
        <div className="mt-2 h-1 bg-[#3a2618]/10">
          <div className="h-full bg-[#c99a2e] transition-all" style={{ width: `${(Math.min(step, steps.length) / steps.length) * 100}%` }} />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">{t(TYPES.find((x) => x.k === kind)!.label)}</p>

        {!showResult && cur && (
          <div className="mt-2">
            <label htmlFor={`cfg-${cur.key}`} className="font-display text-4xl font-black uppercase">
              {t(cur.label)}
            </label>
            {cur.kind === 'num' ? (
              <div className="mt-6">
                <div className="flex items-baseline gap-2">
                  <input
                    id={`cfg-${cur.key}`}
                    type="number"
                    min={cur.min}
                    max={cur.max}
                    step={cur.step}
                    value={v[cur.key] as number}
                    onChange={(e) => setVal(cur.key, Math.min(cur.max, Math.max(cur.min, Number(e.target.value) || cur.min)))}
                    className="w-36 border-b-2 border-[#1c130d] bg-transparent font-display text-6xl font-black tabular-nums outline-none"
                  />
                  <span className="font-display text-3xl font-bold text-[#6b4428]">{cur.unit}</span>
                </div>
                <input type="range" min={cur.min} max={cur.max} step={cur.step} value={v[cur.key] as number} onChange={(e) => setVal(cur.key, Number(e.target.value))} className="wd-range mt-6 w-full" aria-label={t(cur.label)} />
              </div>
            ) : (
              <div className="mt-6 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t(cur.label)}>
                {cur.options.map((o) => (
                  <button key={o.v} type="button" role="radio" aria-checked={v[cur.key] === o.v} onClick={() => setVal(cur.key, o.v)} className={`h-14 border px-4 text-sm font-bold uppercase tracking-wide ${v[cur.key] === o.v ? 'border-[#1c130d] bg-[#1c130d] text-[#f6f1e7]' : 'border-[#3a2618]/25 hover:bg-[#ecdfc8]'}`}>
                    {t(o.label)}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setStep(step + 1)} className="mt-8 flex h-12 items-center gap-2 bg-[#1c130d] px-6 text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#3a2618]">
              {t('cta.next')} <ArrowRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        )}

        {showResult && (
          <div className="mt-2">
            <h2 className="font-display text-4xl font-black uppercase">{t('config.result')}</h2>
            <p className="mt-3 flex gap-2 border-s-4 border-[#c99a2e] bg-[#efe6d4] p-3 text-sm font-semibold text-[#3a2618]">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#a17d1e]" /> {t('config.disclaimer')}
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-[#3a2618]/20 text-start text-[11px] uppercase tracking-wider text-[#6b4428]">
                  <th className="py-2 text-start font-bold">{t('quote.items')}</th>
                  <th className="py-2 text-end font-bold">{t('config.qty')}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((ln) => {
                  const p = byId[ln.productId];
                  return p ? (
                    <tr key={ln.productId} className="border-b border-[#3a2618]/10">
                      <td className="py-2.5">
                        <span className="font-semibold">{l(p.name)}</span>
                        <span className="block text-xs text-[#6b4428]">{formatDims(p, lang)}</span>
                      </td>
                      <td className="py-2.5 text-end font-display text-2xl font-black tabular-nums">
                        {ln.quantity} <span className="font-sans text-xs font-normal text-[#6b4428]">{unitLabel(lang, p.unit, ln.quantity)}</span>
                      </td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  addMany(lines);
                  setAdded(true);
                  toast(t('config.added'));
                }}
                className={`flex h-12 flex-1 items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-[#f6f1e7] ${added ? 'bg-[#2f7a4f]' : 'bg-[#1c130d] hover:bg-[#3a2618]'}`}
              >
                {added ? <Check size={16} /> : <ShoppingCart size={16} />} {t('config.addAll')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!added) addMany(lines);
                  setAdded(true);
                  setQuoteOpen(true);
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 bg-[#1f3a2e] text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#2f5a45]"
              >
                <WhatsAppIcon className="h-4 w-4" /> {t('cta.quote')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setKind(null);
                setValues(DEFAULTS);
              }}
              className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            >
              <RotateCcw size={13} /> {t('config.restart')}
            </button>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        {kind === 'greenhouse' && <GreenhouseSketch L={Number(v.lengthM)} W={Number(v.widthM)} H={Number(v.heightM)} />}
        <div className="border border-[#3a2618]/15 bg-[#fbf8f2] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">{t('config.result')}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {lines.map((ln) => (
              <li key={ln.productId} className="flex justify-between gap-3">
                <span>{byId[ln.productId] ? l(byId[ln.productId].name) : ln.productId}</span>
                <span className="font-semibold tabular-nums">{ln.quantity}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[#6b4428]">{t('config.disclaimer')}</p>
        </div>
      </aside>
    </div>
  );
}
