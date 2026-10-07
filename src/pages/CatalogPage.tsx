import { SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProductCard } from '../components/catalog/ProductCard';
import { SearchBox } from '../components/navigation/SearchBox';
import { useT } from '../i18n';
import { useCatalogStore } from '../stores/catalogStore';
import type { Availability, CategoryId, Product, UsageId } from '../types';

type LenBucket = 'short' | 'mid' | 'long' | 'none';
const lenOf = (p: Product): LenBucket => {
  const L = p.dimensions.lengthM;
  if (!L) return 'none';
  return L < 3 ? 'short' : L <= 4.5 ? 'mid' : 'long';
};

function Chips<T extends string>({ label, values, selected, onToggle, render }: { label: string; values: T[]; selected: Set<T>; onToggle: (v: T) => void; render: (v: T) => string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b4428]">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <button key={v} type="button" aria-pressed={selected.has(v)} onClick={() => onToggle(v)} className={`h-9 border px-3 text-xs font-semibold ${selected.has(v) ? 'border-[#1c130d] bg-[#1c130d] text-[#f6f1e7]' : 'border-[#3a2618]/20 bg-white hover:bg-[#ecdfc8]'}`}>
            {render(v)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const toggle = <T,>(set: Set<T>, v: T) => {
  const n = new Set(set);
  if (n.has(v)) n.delete(v);
  else n.add(v);
  return n;
};

/** Fast, non-3D access to the exact same products as the depot. */
export function CatalogPage() {
  const { t } = useT();
  const products = useCatalogStore((s) => s.products);
  const [cats, setCats] = useState<Set<CategoryId>>(new Set());
  const [uses, setUses] = useState<Set<UsageId>>(new Set());
  const [lens, setLens] = useState<Set<LenBucket>>(new Set());
  const [avail, setAvail] = useState<Set<Availability>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const allUses = useMemo(() => [...new Set(products.flatMap((p) => p.usage))], [products]);
  const allAvail = useMemo(() => [...new Set(products.map((p) => p.availability))], [products]);
  const filtered = products.filter(
    (p) =>
      (!cats.size || cats.has(p.category)) &&
      (!uses.size || p.usage.some((u) => uses.has(u))) &&
      (!lens.size || lens.has(lenOf(p))) &&
      (!avail.size || avail.has(p.availability)),
  );
  const active = cats.size + uses.size + lens.size + avail.size;
  const reset = () => {
    setCats(new Set());
    setUses(new Set());
    setLens(new Set());
    setAvail(new Set());
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-6xl font-black uppercase leading-none tracking-wide">{t('catalog.title')}</h1>
          <p className="mt-2 text-[#6b4428]">{t('catalog.subtitle')}</p>
        </div>
        <div className="w-full md:w-80">
          <SearchBox />
        </div>
      </div>
      <p className="mt-4 border-s-2 border-[#c99a2e] ps-3 text-xs text-[#6b4428]">{t('demo.data')}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className="flex h-11 w-full items-center justify-between border border-[#3a2618]/20 px-4 text-sm font-bold uppercase tracking-wider lg:hidden" aria-expanded={showFilters}>
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} /> {t('catalog.filters')}
              {active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#c99a2e] px-1 text-[11px] text-[#1c130d]">{active}</span>}
            </span>
          </button>
          <div className={`${showFilters ? 'mt-4 block' : 'hidden'} space-y-6 lg:sticky lg:top-24 lg:mt-0 lg:block`}>
            <Chips label={t('catalog.category')} values={['construction', 'agriculture', 'greenhouse', 'seasonal'] as CategoryId[]} selected={cats} onToggle={(v) => setCats((s) => toggle(s, v))} render={(v) => t(`cat.${v}` as 'cat.construction')} />
            <Chips label={t('catalog.usage')} values={allUses} selected={uses} onToggle={(v) => setUses((s) => toggle(s, v))} render={(v) => t(`usage.${v}` as 'usage.formwork')} />
            <Chips label={t('catalog.length')} values={['short', 'mid', 'long', 'none'] as LenBucket[]} selected={lens} onToggle={(v) => setLens((s) => toggle(s, v))} render={(v) => t(`catalog.len.${v}` as 'catalog.len.short')} />
            <Chips label={t('catalog.availability')} values={allAvail} selected={avail} onToggle={(v) => setAvail((s) => toggle(s, v))} render={(v) => t(`avail.${v}` as 'avail.in_stock')} />
            {active > 0 && (
              <button type="button" onClick={reset} className="text-xs font-bold uppercase tracking-wider underline underline-offset-4">
                {t('catalog.reset')}
              </button>
            )}
          </div>
        </aside>
        <section aria-live="polite">
          <p className="mb-3 text-sm text-[#6b4428]">{t('catalog.count', { n: filtered.length })}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
