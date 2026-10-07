import { Menu, ShoppingCart, X } from 'lucide-react';
import { appConfig } from '../../config/env';
import { useT } from '../../i18n';
import { buildWhatsAppUrl } from '../../services/whatsapp';
import { selectTotalItems, useCartStore } from '../../stores/cartStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { hashFor, useUiStore } from '../../stores/uiStore';
import type { Route } from '../../types';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { SearchBox } from './SearchBox';

const LINKS: { r: Route; k: 'nav.home' | 'nav.depot' | 'nav.catalog' | 'nav.solutions' | 'nav.configurator' | 'nav.contact' }[] = [
  { r: 'home', k: 'nav.home' },
  { r: 'depot', k: 'nav.depot' },
  { r: 'catalog', k: 'nav.catalog' },
  { r: 'solutions', k: 'nav.solutions' },
  { r: 'configurator', k: 'nav.configurator' },
  { r: 'contact', k: 'nav.contact' },
];

export function Logo({ light = false }: { light?: boolean }) {
  const name = useCatalogStore((s) => s.settings.businessName);
  return (
    <span className={`flex items-center gap-2 ${light ? 'text-[#f6f1e7]' : 'text-[#1c130d]'}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect x="2" y="18" width="28" height="5" fill="currentColor" />
        <rect x="4" y="11" width="24" height="5" fill="currentColor" opacity="0.8" />
        <rect x="7" y="4" width="18" height="5" fill="currentColor" opacity="0.6" />
        <rect x="2" y="25" width="28" height="3" fill="#c99a2e" />
      </svg>
      <span className="font-display text-xl font-black uppercase leading-none tracking-[0.1em]">{name}</span>
    </span>
  );
}

export function LangSwitch({ light = false }: { light?: boolean }) {
  const { t, lang } = useT();
  const setLang = useUiStore((s) => s.setLang);
  return (
    <div className={`flex items-center text-sm ${light ? 'text-[#f6f1e7]' : 'text-[#1c130d]'}`} role="group" aria-label={t('common.lang')}>
      <button type="button" onClick={() => setLang('fr')} aria-pressed={lang === 'fr'} className={`px-1.5 py-1 font-semibold ${lang === 'fr' ? 'underline decoration-2 underline-offset-4' : 'opacity-60 hover:opacity-100'}`}>
        FR
      </button>
      <span className="opacity-40">|</span>
      <button type="button" onClick={() => setLang('ar')} aria-pressed={lang === 'ar'} lang="ar" className={`px-1.5 py-1 font-arabic ${lang === 'ar' ? 'underline decoration-2 underline-offset-4' : 'opacity-60 hover:opacity-100'}`}>
        العربية
      </button>
    </div>
  );
}

export function useWhatsAppHref() {
  const { t } = useT();
  const number = useCatalogStore((s) => s.settings.whatsapp) ?? appConfig.whatsappNumber;
  return buildWhatsAppUrl(number, t('wa.generic'));
}

export function Header({ overHero }: { overHero: boolean }) {
  const { t } = useT();
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const menu = useUiStore((s) => s.mobileMenuOpen);
  const setMenu = useUiStore((s) => s.setMobileMenuOpen);
  const total = useCartStore(selectTotalItems);
  const wa = useWhatsAppHref();
  const light = overHero && !menu;

  const link = (r: Route, k: (typeof LINKS)[number]['k']) => (
    <a
      key={r}
      href={hashFor(r)}
      onClick={(e) => {
        e.preventDefault();
        navigate(r, r === 'depot' ? { intro: true } : undefined);
      }}
      aria-current={route === r ? 'page' : undefined}
      className={`relative py-1 text-[13px] font-semibold uppercase tracking-[0.08em] transition-opacity ${route === r ? 'opacity-100 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-current' : 'opacity-75 hover:opacity-100'}`}
    >
      {t(k)}
    </a>
  );

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${light ? 'bg-gradient-to-b from-black/50 to-transparent text-[#f6f1e7]' : 'border-b border-[#3a2618]/10 bg-[#f6f1e7]/92 text-[#1c130d] backdrop-blur-md'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <button type="button" className="grid h-10 w-10 place-items-center lg:hidden" onClick={() => setMenu(!menu)} aria-label={menu ? t('nav.close') : t('nav.menu')} aria-expanded={menu}>
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate('home');
          }}
          className="me-auto lg:me-0"
        >
          <Logo light={light} />
        </a>
        <nav className="ms-6 hidden items-center gap-6 lg:flex" aria-label="Navigation">
          {LINKS.map((l) => link(l.r, l.k))}
        </nav>
        <div className="ms-auto hidden w-56 xl:block">
          <SearchBox variant={light ? 'dark' : 'light'} />
        </div>
        <div className="hidden lg:block">
          <LangSwitch light={light} />
        </div>
        <button type="button" onClick={() => setCartOpen(true)} className="relative grid h-10 w-10 place-items-center" aria-label={t('cart.open', { n: total })}>
          <ShoppingCart size={20} />
          {total > 0 && <span className="absolute -end-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#c99a2e] px-1 text-[11px] font-bold text-[#1c130d]">{total > 999 ? '999+' : total}</span>}
        </button>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-2 bg-[#1f3a2e] px-3 text-sm font-bold uppercase tracking-wide text-[#f6f1e7] hover:bg-[#2f5a45] sm:px-4" aria-label={t('cta.whatsapp')}>
          <WhatsAppIcon className="h-5 w-5" />
          <span className="hidden sm:inline">{t('cta.whatsapp')}</span>
        </a>
      </div>
      {menu && (
        <div className="wd-fade-in border-t border-[#3a2618]/10 bg-[#f6f1e7] px-4 pb-6 pt-3 text-[#1c130d] lg:hidden">
          <SearchBox onDone={() => setMenu(false)} />
          <nav className="mt-3 flex flex-col divide-y divide-[#3a2618]/10" aria-label="Navigation">
            {[...LINKS, { r: 'about' as Route, k: 'nav.about' as const }].map((l) => (
              <a
                key={l.r}
                href={hashFor(l.r)}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(l.r, l.r === 'depot' ? { intro: true } : undefined);
                }}
                className="py-3 font-display text-2xl font-extrabold uppercase"
              >
                {t(l.k as 'nav.about')}
              </a>
            ))}
          </nav>
          <div className="mt-4">
            <LangSwitch />
          </div>
        </div>
      )}
    </header>
  );
}
