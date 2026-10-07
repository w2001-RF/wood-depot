import { translate } from '../i18n';
import type { Lang, Product } from '../types';

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ْ]/g, '') // arabic diacritics
    .trim();
}

/** Accent-insensitive search over names (fr+ar), slug, category and usages. */
export function searchProducts(products: Product[], query: string, lang: Lang): Product[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(/\s+/);
  const scored: { p: Product; score: number }[] = [];
  for (const p of products) {
    const name = normalize(`${p.name.fr} ${p.name.ar}`);
    const hay = normalize(
      [
        p.name.fr,
        p.name.ar,
        p.slug,
        translate(lang, `cat.${p.category}` as 'cat.construction'),
        ...p.usage.map((u) => `${translate('fr', `usage.${u}` as 'usage.formwork')} ${translate('ar', `usage.${u}` as 'usage.formwork')}`),
      ].join(' '),
    );
    if (!terms.every((t) => hay.includes(t))) continue;
    const score = terms.reduce((s, t) => s + (name.startsWith(t) ? 3 : name.includes(t) ? 2 : 1), 0);
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.p);
}
