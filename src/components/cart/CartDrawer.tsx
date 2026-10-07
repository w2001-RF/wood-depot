import { Compass, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useT } from '../../i18n';
import { selectTotalItems, useCartStore } from '../../stores/cartStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { useUiStore } from '../../stores/uiStore';
import { formatDims } from '../../utils/format';
import { unitLabel } from '../../services/whatsapp';
import { QtyStepper } from '../catalog/ProductInspector';
import { ProductIllustration } from '../catalog/ProductIllustration';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

export function CartDrawer() {
  const { t, l, lang } = useT();
  const open = useUiStore((s) => s.cartOpen);
  const setOpen = useUiStore((s) => s.setCartOpen);
  const setQuoteOpen = useUiStore((s) => s.setQuoteOpen);
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  const items = useCartStore((s) => s.items);
  const total = useCartStore(selectTotalItems);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const byId = useCatalogStore((s) => s.byId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" className="wd-fade-in absolute inset-0 bg-[#120c08]/50" onClick={() => setOpen(false)} aria-label={t('cta.close')} />
      <aside className="wd-drawer-in absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-[#f6f1e7] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#3a2618]/10 px-5 py-4">
          <h2 id="cart-title" className="flex items-center gap-2 font-display text-2xl font-black uppercase tracking-wide">
            <ShoppingCart size={20} /> {t('cart.title')}
          </h2>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center hover:bg-[#ecdfc8]" aria-label={t('cta.close')}>
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#6b4428]">{t('cart.empty')}</p>
          ) : (
            <ul className="divide-y divide-[#3a2618]/10">
              {items.map((it) => {
                const p = byId[it.productId];
                if (!p) return null;
                return (
                  <li key={it.productId} className="flex gap-3 px-5 py-4">
                    <div className="h-16 w-20 shrink-0 overflow-hidden border border-[#3a2618]/10">
                      <ProductIllustration product={p} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-extrabold uppercase leading-tight">{l(p.name)}</p>
                      <p className="text-xs text-[#6b4428]">{formatDims(p, lang)}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="scale-90 origin-[0_50%] rtl:origin-[100%_50%]">
                          <QtyStepper value={it.quantity} onChange={(n) => setQuantity(p.id, n)} label={`${t('product.quantity')} ${l(p.name)}`} />
                        </div>
                        <span className="text-xs text-[#6b4428]">{unitLabel(lang, p.unit, it.quantity)}</span>
                        <button type="button" onClick={() => remove(p.id)} className="grid h-9 w-9 place-items-center text-[#8a3b2b] hover:bg-[#ecdfc8]" aria-label={`${t('cart.remove')} ${l(p.name)}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <footer className="border-t border-[#3a2618]/10 bg-[#efe6d4] px-5 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-3xl font-black tabular-nums">{t('cart.items', { n: total })}</span>
            <span className="text-xs text-[#6b4428]">{t('cart.lines', { n: items.length })}</span>
          </div>
          <p className="mt-1 text-xs text-[#6b4428]">{t('cart.note')}</p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              disabled={!items.length}
              className="flex h-12 items-center justify-center gap-2 bg-[#1f3a2e] text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#2f5a45] disabled:opacity-40"
            >
              <WhatsAppIcon className="h-4 w-4" /> {t('cta.quote')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (route !== 'depot') navigate('depot');
              }}
              className="flex h-12 items-center justify-center gap-2 border border-[#3a2618]/25 text-sm font-bold uppercase tracking-wider hover:bg-[#ecdfc8]"
            >
              <Compass size={16} /> {t('cta.continue')}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
