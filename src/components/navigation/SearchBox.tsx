import { Eye, Navigation, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZONES } from '../../config/depotLayout';
import { useT } from '../../i18n';
import { searchProducts } from '../../services/search';
import { useCatalogStore } from '../../stores/catalogStore';
import { useUiStore } from '../../stores/uiStore';
import { useDepotStore } from '../../stores/depotStore';
import { formatDims } from '../../utils/format';
import { guideToProduct } from '../3d/interactions/actions';

/** Global product search. "Me guider" walks the visitor to the pile in the 3D depot. */
export function SearchBox({ variant = 'light', autoFocus = false, onDone }: { variant?: 'light' | 'dark'; autoFocus?: boolean; onDone?: () => void }) {
  const { t, l, lang } = useT();
  const products = useCatalogStore((s) => s.products);
  const categories = useCatalogStore((s) => s.categories);
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  const inspect = useUiStore((s) => s.inspect);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => searchProducts(products, q, lang).slice(0, 6), [products, q, lang]);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const zoneOf = (catId: string) => {
    const z = categories.find((c) => c.id === catId)?.zoneId;
    const def = ZONES.find((zz) => zz.id === z);
    return def ? `${def.code} · ${t(`zone.${def.id}` as 'zone.desk')}` : '';
  };

  const guide = (id: string) => {
    setOpen(false);
    setQ('');
    onDone?.();
    // inside the depot (3D or plan view) guide immediately; elsewhere open the depot first
    if (route === 'depot' && useDepotStore.getState().phase !== 'loading') guideToProduct(id);
    else navigate('depot', { guideProductId: id });
  };

  const dark = variant === 'dark';
  return (
    <div className="relative w-full">
      <label className={`flex h-10 items-center gap-2 border px-3 ${dark ? 'border-[#ecdfc8]/25 bg-[#1c130d]/70 text-[#f6f1e7]' : 'border-[#3a2618]/20 bg-white/70 text-[#1c130d]'}`}>
        <Search size={16} className="shrink-0 opacity-70" aria-hidden />
        <span className="sr-only">{t('search.label')}</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              onDone?.();
            }
            if (e.key === 'Enter' && results[0]) guide(results[0].id);
          }}
          placeholder={t('search.placeholder')}
          className="w-full bg-transparent text-sm outline-none placeholder:opacity-60"
          role="combobox"
          aria-expanded={open && !!q}
          aria-controls={listId}
          autoComplete="off"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label={t('cta.close')} className="opacity-60 hover:opacity-100">
            <X size={15} />
          </button>
        )}
      </label>
      {open && q && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-[60vh] overflow-auto border border-[#3a2618]/15 bg-[#f6f1e7] text-[#1c130d] shadow-2xl">
          {results.length === 0 && <p className="px-4 py-3 text-sm text-[#6b4428]">{t('search.none')}</p>}
          {results.map((p, i) => (
            <div key={p.id} role="option" aria-selected={i === 0} className="border-b border-[#3a2618]/10 px-4 py-3 last:border-0">
              {i === 0 && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2f5a45]">{t('search.found')}</p>}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l(p.name)}</p>
                  <p className="text-xs text-[#6b4428]">
                    {t('product.zone')} : {zoneOf(p.category)} · {formatDims(p, lang)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      inspect({ productId: p.id });
                    }}
                    className="grid h-8 w-8 place-items-center border border-[#3a2618]/20 hover:bg-[#ecdfc8]"
                    aria-label={`${t('cta.view')} ${l(p.name)}`}
                  >
                    <Eye size={15} />
                  </button>
                  <button type="button" onClick={() => guide(p.id)} className="flex h-8 items-center gap-1 bg-[#1f3a2e] px-2.5 text-xs font-bold uppercase tracking-wide text-[#f6f1e7] hover:bg-[#2f5a45]">
                    <Navigation size={13} />
                    {t('cta.guide')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
