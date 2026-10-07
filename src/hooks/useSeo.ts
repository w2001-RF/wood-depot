import { useEffect } from 'react';
import { translate } from '../i18n';
import { useCatalogStore } from '../stores/catalogStore';
import { useUiStore } from '../stores/uiStore';

/** Per-route title + LocalBusiness / Product structured data from the live catalogue. */
export function useSeo() {
  const route = useUiStore((s) => s.route);
  const lang = useUiStore((s) => s.lang);
  const products = useCatalogStore((s) => s.products);
  const settings = useCatalogStore((s) => s.settings);

  useEffect(() => {
    const base = `Bois de construction à Sidi Yahya El Gharb | ${settings.businessName}`;
    const page: Record<string, string> = {
      home: base,
      depot: `${translate(lang, 'nav.depot')} | ${settings.businessName}`,
      catalog: `${translate(lang, 'catalog.title')} | ${settings.businessName}`,
      solutions: `${translate(lang, 'solutions.title')} | ${settings.businessName}`,
      configurator: `${translate(lang, 'config.title')} | ${settings.businessName}`,
      about: `${translate(lang, 'about.title')} | ${settings.businessName}`,
      contact: `${translate(lang, 'contact.title')} | ${settings.businessName}`,
    };
    document.title = page[route] ?? base;
  }, [route, lang, settings.businessName]);

  useEffect(() => {
    const data = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'LocalBusiness',
          name: settings.businessName,
          address: { '@type': 'PostalAddress', addressLocality: 'Sidi Yahya El Gharb', addressCountry: 'MA' },
          ...(settings.phone ? { telephone: settings.phone } : {}),
          ...(settings.latitude != null && settings.longitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: settings.latitude, longitude: settings.longitude } } : {}),
        },
        ...products.map((p) => ({
          '@type': 'Product',
          name: p.name.fr,
          description: p.description.fr,
          category: p.category,
          sku: p.slug,
          // No invented prices: offers only describe availability.
          offers: { '@type': 'Offer', availability: p.availability === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability', priceSpecification: { '@type': 'PriceSpecification', description: 'Sur devis' } },
        })),
      ],
    };
    let el = document.getElementById('wd-ld') as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'wd-ld';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }, [products, settings]);
}
