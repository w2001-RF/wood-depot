import { Compass, Ruler } from 'lucide-react';
import { ProductCard } from '../components/catalog/ProductCard';
import { useT } from '../i18n';
import { useCatalogStore } from '../stores/catalogStore';
import { useUiStore } from '../stores/uiStore';
import type { CategoryId } from '../types';

const BLOCKS: { cat: CategoryId; t: 'solutions.construction.t' | 'solutions.agriculture.t' | 'solutions.greenhouse.t' | 'solutions.seasonal.t'; d: 'solutions.construction.d' | 'solutions.agriculture.d' | 'solutions.greenhouse.d' | 'solutions.seasonal.d'; code: string; guide: string }[] = [
  { cat: 'construction', t: 'solutions.construction.t', d: 'solutions.construction.d', code: 'A', guide: 'madrier' },
  { cat: 'agriculture', t: 'solutions.agriculture.t', d: 'solutions.agriculture.d', code: 'B', guide: 'poteau-agricole' },
  { cat: 'greenhouse', t: 'solutions.greenhouse.t', d: 'solutions.greenhouse.d', code: 'C', guide: 'poteau-serre' },
  { cat: 'seasonal', t: 'solutions.seasonal.t', d: 'solutions.seasonal.d', code: 'D', guide: 'sac-charbon-15' },
];

export function SolutionsPage() {
  const { t } = useT();
  const products = useCatalogStore((s) => s.products);
  const navigate = useUiStore((s) => s.navigate);
  return (
    <div className="pb-20 pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-6xl font-black uppercase leading-none tracking-wide">{t('solutions.title')}</h1>
        <p className="mt-2 text-[#6b4428]">{t('solutions.subtitle')}</p>
      </div>
      {BLOCKS.map((b, i) => (
        <section key={b.cat} className={`mt-12 ${i % 2 ? 'bg-[#efe6d4]' : ''}`}>
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[360px_1fr]">
            <div>
              <span className="font-display text-7xl font-black leading-none text-[#3a2618]/15">{b.code}</span>
              <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none">{t(b.t)}</h2>
              <p className="mt-3 text-[#6b4428]">{t(b.d)}</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button type="button" onClick={() => navigate('depot', { guideProductId: b.guide })} className="flex h-12 items-center justify-center gap-2 bg-[#1c130d] px-5 text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#3a2618]">
                  <Compass size={16} /> {t('solutions.explore')}
                </button>
                {b.cat !== 'seasonal' && (
                  <button type="button" onClick={() => navigate('configurator')} className="flex h-12 items-center justify-center gap-2 border border-[#3a2618]/30 px-5 text-sm font-bold uppercase tracking-wider hover:bg-[#ecdfc8]">
                    <Ruler size={16} /> {t('solutions.configure')}
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b4428]">{t('solutions.products')}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products
                  .filter((p) => p.category === b.cat)
                  .slice(0, 3)
                  .map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
