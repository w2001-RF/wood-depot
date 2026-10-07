import { ShoppingCart } from 'lucide-react';
import { Suspense, lazy, useEffect } from 'react';
import { CartDrawer } from './components/cart/CartDrawer';
import { ProductInspector } from './components/catalog/ProductInspector';
import { Footer } from './components/navigation/Footer';
import { Header, useWhatsAppHref } from './components/navigation/Header';
import { QuoteModal } from './components/quotation/QuoteModal';
import { Toaster } from './components/ui/Toaster';
import { WhatsAppIcon } from './components/ui/WhatsAppIcon';
import { useSeo } from './hooks/useSeo';
import { useT } from './i18n';
import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';
import { AboutPage, ConfiguratorPage, ContactPage } from './pages/OtherPages';
import { SolutionsPage } from './pages/SolutionsPage';
import { selectTotalItems, useCartStore } from './stores/cartStore';
import { useCatalogStore } from './stores/catalogStore';
import { useUiStore } from './stores/uiStore';

// The full depot (geometry, textures, controllers) only loads when entered.
const DepotExperience = lazy(() => import('./components/3d/depot/DepotExperience'));

/** Mobile: cart + WhatsApp always under the thumb. */
function MobileDock() {
  const { t } = useT();
  const total = useCartStore(selectTotalItems);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const wa = useWhatsAppHref();
  return (
    <div className="fixed bottom-4 end-4 z-30 flex flex-col gap-2 sm:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      {total > 0 && (
        <button type="button" onClick={() => setCartOpen(true)} className="relative grid h-14 w-14 place-items-center bg-[#1c130d] text-[#f6f1e7] shadow-xl" aria-label={t('cart.open', { n: total })}>
          <ShoppingCart size={22} />
          <span className="absolute -end-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#c99a2e] px-1 text-xs font-bold text-[#1c130d]">{total}</span>
        </button>
      )}
      <a href={wa} target="_blank" rel="noopener noreferrer" className="grid h-14 w-14 place-items-center bg-[#1f7a4d] text-white shadow-xl" aria-label={t('cta.whatsapp')}>
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </div>
  );
}

function DepotLoading() {
  return <div className="fixed inset-0 bg-[#1c130d]" />;
}

export default function App() {
  const route = useUiStore((s) => s.route);
  const lang = useUiStore((s) => s.lang);
  const setRouteFromHash = useUiStore((s) => s.setRouteFromHash);
  const load = useCatalogStore((s) => s.load);
  useSeo();

  useEffect(() => {
    load();
    const onHash = () => setRouteFromHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [load, setRouteFromHash]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const inDepot = route === 'depot';
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:bg-white focus:px-3 focus:py-2">
        Aller au contenu
      </a>
      {!inDepot && <Header overHero={route === 'home'} />}
      <main id="main" key={route} className={inDepot ? '' : 'wd-page-in min-h-screen'}>
        {route === 'home' && <HomePage />}
        {route === 'catalog' && <CatalogPage />}
        {route === 'solutions' && <SolutionsPage />}
        {route === 'configurator' && <ConfiguratorPage />}
        {route === 'about' && <AboutPage />}
        {route === 'contact' && <ContactPage />}
        {inDepot && (
          <Suspense fallback={<DepotLoading />}>
            <DepotExperience />
          </Suspense>
        )}
      </main>
      {!inDepot && <Footer />}
      {!inDepot && <MobileDock />}
      <ProductInspector />
      <CartDrawer />
      <QuoteModal />
      <Toaster />
    </>
  );
}
