import { Eye, Plus } from 'lucide-react';
import { useT } from '../../i18n';
import { useCartStore } from '../../stores/cartStore';
import { useUiStore } from '../../stores/uiStore';
import type { Product } from '../../types';
import { formatDims } from '../../utils/format';
import { AvailabilityBadge } from './ProductInspector';
import { ProductIllustration } from './ProductIllustration';

export function ProductCard({ product }: { product: Product }) {
  const { t, l, lang } = useT();
  const inspect = useUiStore((s) => s.inspect);
  const toast = useUiStore((s) => s.toast);
  const add = useCartStore((s) => s.add);
  const qty = product.unit === 'kg' ? 25 : 1;
  return (
    <article className="group flex flex-col border border-[#3a2618]/12 bg-[#fbf8f2] transition hover:border-[#3a2618]/35">
      <button type="button" onClick={() => inspect({ productId: product.id })} className="relative aspect-[3/2] overflow-hidden" aria-label={`${t('cta.view')} ${l(product.name)}`}>
        <div className="h-full w-full transition duration-500 group-hover:scale-[1.03]">
          <ProductIllustration product={product} />
        </div>
        <span className="absolute start-2 top-2 bg-[#1c130d]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ecdfc8]">{t(`cat.${product.category}` as 'cat.construction')}</span>
        {product.isDemo && <span className="absolute end-2 top-2 border border-[#6b4428]/30 bg-[#f6f1e7]/90 px-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#6b4428]">{t('demo.badge')}</span>}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-xl font-extrabold uppercase leading-tight">{l(product.name)}</h3>
        <p className="mt-0.5 text-sm text-[#6b4428]">{formatDims(product, lang)}</p>
        <div className="mt-3 flex items-center justify-between">
          <AvailabilityBadge value={product.availability} />
          <span className="text-sm font-semibold">{t('price.onQuote')}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => inspect({ productId: product.id })} className="flex h-10 items-center justify-center gap-1.5 border border-[#3a2618]/25 text-xs font-bold uppercase tracking-wider hover:bg-[#ecdfc8]">
            <Eye size={15} /> {t('cta.view')}
          </button>
          <button
            type="button"
            onClick={() => {
              add(product.id, qty);
              toast(t('product.added', { qty, name: l(product.name) }));
            }}
            className="flex h-10 items-center justify-center gap-1.5 bg-[#1c130d] text-xs font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#3a2618]"
          >
            <Plus size={15} /> {t('cta.add')}
          </button>
        </div>
      </div>
    </article>
  );
}
