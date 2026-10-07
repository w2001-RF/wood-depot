import { useT } from '../../i18n';
import { useCatalogStore } from '../../stores/catalogStore';
import { hashFor, useUiStore } from '../../stores/uiStore';
import type { Route } from '../../types';
import { LangSwitch, Logo } from './Header';

export function Footer() {
  const { t, l } = useT();
  const settings = useCatalogStore((s) => s.settings);
  const hasDemoData = useCatalogStore((s) => s.settings.isDemo || s.products.some((p) => p.isDemo));
  const navigate = useUiStore((s) => s.navigate);
  const links: [Route, 'nav.depot' | 'nav.catalog' | 'nav.solutions' | 'nav.configurator' | 'nav.about' | 'nav.contact'][] = [
    ['depot', 'nav.depot'],
    ['catalog', 'nav.catalog'],
    ['solutions', 'nav.solutions'],
    ['configurator', 'nav.configurator'],
    ['about', 'nav.about'],
    ['contact', 'nav.contact'],
  ];
  return (
    <footer className="bg-[#1c130d] text-[#ecdfc8]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-3 max-w-sm text-sm text-[#d9c3a0]">{t('about.lead')}</p>
          <p className="mt-3 text-sm">{l(settings.address)}</p>
        </div>
        <nav className="grid grid-cols-2 gap-2 text-sm" aria-label="Footer">
          {links.map(([r, k]) => (
            <a
              key={r}
              href={hashFor(r)}
              onClick={(e) => {
                e.preventDefault();
                navigate(r);
              }}
              className="hover:text-white"
            >
              {t(k)}
            </a>
          ))}
        </nav>
        <div className="space-y-3">
          <LangSwitch light />
          {hasDemoData && <p className="border border-[#d9c3a0]/30 p-3 text-xs leading-relaxed text-[#d9c3a0]">{t('demo.data')}</p>}
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-[#d9c3a0]/70">
        © {new Date().getFullYear()} {settings.businessName} · {t('footer.rights')}
      </p>
    </footer>
  );
}
