import { Check, Maximize, Minus, Plus, RotateCw, ScanLine, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ZONES } from '../../config/depotLayout';
import { useT } from '../../i18n';
import { MAX_QTY, selectQtyOf, useCartStore } from '../../stores/cartStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { useDepotStore } from '../../stores/depotStore';
import { useUiStore } from '../../stores/uiStore';
import { formatCm, formatDims, formatLen } from '../../utils/format';
import { isWebGLAvailable } from '../../utils/webgl';
import type { ViewerMode } from '../3d/viewer/ProductViewer3D';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { ProductIllustration } from './ProductIllustration';

const ProductViewer3D = lazy(() => import('../3d/viewer/ProductViewer3D'));

export function AvailabilityBadge({ value }: { value: string }) {
  const { t } = useT();
  const color = value === 'in_stock' ? '#2f7a4f' : value === 'limited' ? '#b7791f' : value === 'seasonal' ? '#6b4428' : '#6b6b6b';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {t(`avail.${value}` as 'avail.in_stock')}
    </span>
  );
}

export function QtyStepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const { t } = useT();
  return (
    <div className="flex h-12 items-stretch border border-[#3a2618]/25 bg-white" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid w-12 place-items-center hover:bg-[#ecdfc8]" aria-label={t('product.decrease')}>
        <Minus size={16} />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value.replace(/\D/g, ''), 10);
          onChange(Number.isFinite(n) ? Math.min(MAX_QTY, Math.max(1, n)) : 1);
        }}
        className="w-16 border-x border-[#3a2618]/15 text-center font-display text-xl font-bold outline-none"
        aria-label={label}
      />
      <button type="button" onClick={() => onChange(Math.min(MAX_QTY, value + 1))} className="grid w-12 place-items-center hover:bg-[#ecdfc8]" aria-label={t('product.increase')}>
        <Plus size={16} />
      </button>
    </div>
  );
}

/**
 * Product inspection. In the depot it freezes movement (overlay open) and
 * flashes the pile on add; from the catalog it is a plain product sheet.
 */
export function ProductInspector() {
  const { t, l, lang } = useT();
  const inspection = useUiStore((s) => s.inspection);
  const inspect = useUiStore((s) => s.inspect);
  const toast = useUiStore((s) => s.toast);
  const setQuoteOpen = useUiStore((s) => s.setQuoteOpen);
  const product = useCatalogStore((s) => (inspection ? s.byId[inspection.productId] : undefined));
  const categories = useCatalogStore((s) => s.categories);
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore(selectQtyOf(inspection?.productId ?? ''));
  const [qty, setQty] = useState(10);
  const [mode, setMode] = useState<ViewerMode>('overview');
  const [spin, setSpin] = useState(true);
  const [justAdded, setJustAdded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const webgl = useMemo(() => isWebGLAvailable(), []);

  useEffect(() => {
    if (!product) return;
    setQty(product.unit === 'kg' ? 25 : product.shape === 'bag' ? 5 : 10);
    setMode('overview');
    setSpin(true);
    setJustAdded(false);
    closeRef.current?.focus();
  }, [product]);

  const close = () => {
    inspect(null);
    useDepotStore.getState().setInspecting(null);
  };

  useEffect(() => {
    if (!inspection) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspection]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!inspection || !product) return null;
  const zone = ZONES.find((z) => z.id === categories.find((c) => c.id === product.category)?.zoneId);
  const d = product.dimensions;

  const doAdd = () => {
    add(product.id, qty);
    toast(t('product.added', { qty, name: l(product.name) }));
    setJustAdded(true);
    const placement = inspection.placementId;
    window.setTimeout(() => {
      close();
      if (placement) useDepotStore.getState().flashAdded(placement, qty);
    }, 650);
  };

  const quote = () => {
    if (!inCart) add(product.id, qty);
    close();
    setQuoteOpen(true);
  };

  const rows: [string, string][] = [];
  if (d.lengthM) rows.push([t('product.length'), formatLen(d.lengthM, lang)]);
  if (d.widthCm) rows.push([t('product.width'), formatCm(d.widthCm, lang)]);
  if (d.thicknessCm) rows.push([t('product.thickness'), formatCm(d.thicknessCm, lang)]);
  if (d.diameterCm) rows.push([t('product.diameter'), `Ø ${formatCm(d.diameterCm, lang)}`]);
  if (d.weightKg) rows.push([t('product.weight'), `${d.weightKg} kg`]);
  if (product.unit === 'kg') rows.push([t('product.dimensions'), t('product.soldPerKg')]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="insp-title">
      <button type="button" className="wd-fade-in absolute inset-0 bg-[#120c08]/55 backdrop-blur-[2px]" onClick={close} aria-label={t('cta.close')} />
      <div className="wd-sheet-in relative flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-[#f6f1e7] shadow-2xl sm:max-h-[88vh] sm:flex-row">
        {/* viewer */}
        <div className="wd-viewer-bg relative h-[38vh] shrink-0 sm:h-auto sm:w-[56%]">
          {webgl ? (
            <Suspense fallback={<div className="grid h-full place-items-center text-xs text-[#d9c3a0]">…</div>}>
              <ProductViewer3D product={product} lang={lang} mode={mode} spin={spin} />
            </Suspense>
          ) : (
            <div className="flex h-full flex-col">
              <ProductIllustration product={product} />
              <p className="px-4 pb-3 text-center text-xs text-[#d9c3a0]">{t('viewer.unavailable')}</p>
            </div>
          )}
          {webgl && (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                <button type="button" onClick={() => setMode('overview')} aria-pressed={mode === 'overview'} className={`wd-chip ${mode === 'overview' ? 'wd-chip-on' : ''}`}>
                  <Maximize size={13} /> {t('viewer.overview')}
                </button>
                {(product.shape === 'board' || product.shape === 'round') && (
                  <button type="button" onClick={() => setMode('section')} aria-pressed={mode === 'section'} className={`wd-chip ${mode === 'section' ? 'wd-chip-on' : ''}`}>
                    <ScanLine size={13} /> {t('viewer.section')}
                  </button>
                )}
                <button type="button" onClick={() => setSpin((v) => !v)} aria-pressed={spin} className={`wd-chip ${spin ? 'wd-chip-on' : ''}`}>
                  <RotateCw size={13} /> {t('viewer.spin')}
                </button>
              </div>
              <p className="hidden text-[11px] text-[#ecdfc8]/70 lg:block">{t('viewer.drag')}</p>
            </div>
          )}
          {product.isDemo && <span className="absolute start-3 top-3 bg-[#1c130d]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9c3a0]">{t('demo.badge')}</span>}
        </div>

        {/* info */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-[#3a2618]/10 px-5 pb-3 pt-4 sm:px-7 sm:pt-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">
                {zone ? `${zone.code} · ` : ''}
                {t(`cat.${product.category}` as 'cat.construction')}
              </p>
              <h2 id="insp-title" className="mt-1 font-display text-3xl font-black uppercase leading-[0.95] tracking-wide text-[#1c130d] sm:text-4xl">
                {l(product.name)}
              </h2>
              <p className="mt-1 font-display text-lg font-bold text-[#6b4428]">{formatDims(product, lang)}</p>
            </div>
            <button ref={closeRef} type="button" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center border border-[#3a2618]/15 hover:bg-[#ecdfc8]" aria-label={t('cta.close')}>
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
            <p className="text-sm leading-relaxed text-[#3a2618]">{l(product.description)}</p>
            <dl className="mt-4 grid grid-cols-2 gap-px border border-[#3a2618]/10 bg-[#3a2618]/10 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="bg-[#f6f1e7] px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-[#6b4428]">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
              <div className="bg-[#f6f1e7] px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wider text-[#6b4428]">{t('product.availability')}</dt>
                <dd>
                  <AvailabilityBadge value={product.availability} />
                </dd>
              </div>
              <div className="bg-[#f6f1e7] px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wider text-[#6b4428]">{t('product.price')}</dt>
                <dd className="font-semibold">{t('price.onQuote')}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] uppercase tracking-wider text-[#6b4428]">{t('product.uses')}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {product.usage.map((u) => (
                <li key={u} className="border border-[#3a2618]/20 px-2 py-0.5 text-xs">
                  {t(`usage.${u}` as 'usage.formwork')}
                </li>
              ))}
            </ul>
          </div>

          {/* sticky actions */}
          <div className="border-t border-[#3a2618]/10 bg-[#efe6d4] px-5 py-4 sm:px-7" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6b4428]">{t('product.quantity')}</span>
              {inCart > 0 && <span className="text-xs text-[#2f5a45]">{t('product.inCart', { qty: inCart })}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <QtyStepper value={qty} onChange={setQty} label={t('product.quantity')} />
              <div className="flex gap-1">
                {(product.unit === 'kg' ? [10, 50, 100] : [5, 20, 50]).map((n) => (
                  <button key={n} type="button" onClick={() => setQty(n)} className={`h-12 min-w-11 border px-2 text-sm font-semibold ${qty === n ? 'border-[#1c130d] bg-[#1c130d] text-[#f6f1e7]' : 'border-[#3a2618]/20 hover:bg-[#ecdfc8]'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={doAdd}
                disabled={justAdded}
                className={`flex h-12 items-center justify-center gap-2 px-5 text-sm font-bold uppercase tracking-wider text-[#f6f1e7] transition ${justAdded ? 'bg-[#2f7a4f]' : 'bg-[#1c130d] hover:bg-[#3a2618]'}`}
              >
                {justAdded ? <Check size={18} /> : <Plus size={18} />}
                {t('cta.addToCart')}
              </button>
              <button type="button" onClick={quote} className="flex h-12 items-center justify-center gap-2 border border-[#1f3a2e] px-4 text-sm font-bold uppercase tracking-wider text-[#1f3a2e] hover:bg-[#1f3a2e] hover:text-[#f6f1e7]">
                <WhatsAppIcon className="h-4 w-4" />
                {t('cta.quote')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
