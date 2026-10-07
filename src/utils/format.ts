import { translate } from '../i18n';
import type { Lang, Product } from '../types';

const num = (n: number, lang: Lang, digits = 0) =>
  n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 1) });

/** "4,00 m × 10 cm × 5 cm" · "2,50 m · Ø 10 cm" · "15 kg" */
export function formatDims(p: Product, lang: Lang): string {
  const d = p.dimensions;
  const m = lang === 'ar' ? 'م' : 'm';
  const cm = lang === 'ar' ? 'سم' : 'cm';
  if (p.shape === 'bag') return `${num(d.weightKg ?? 0, lang)} ${lang === 'ar' ? 'كلغ' : 'kg'}`;
  if (p.shape === 'bulk') return translate(lang, 'product.soldPerKg');
  const len = `${num(d.lengthM ?? 0, lang, 2)} ${m}`;
  if (p.shape === 'round') return `${len} · Ø ${num(d.diameterCm ?? 0, lang)} ${cm}`;
  return `${len} × ${num(d.widthCm ?? 0, lang)} ${cm} × ${num(d.thicknessCm ?? 0, lang)} ${cm}`;
}

export function formatLen(m: number, lang: Lang) {
  return `${num(m, lang, 2)} ${lang === 'ar' ? 'م' : 'm'}`;
}
export function formatCm(cm: number, lang: Lang) {
  return `${num(cm, lang)} ${lang === 'ar' ? 'سم' : 'cm'}`;
}
