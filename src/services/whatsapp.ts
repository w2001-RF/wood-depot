import { translate } from '../i18n';
import type { Lang, Product, QuoteRequest } from '../types';

export function unitLabel(lang: Lang, unit: Product['unit'], qty: number): string {
  return translate(lang, (qty > 1 ? `unit.${unit}.pl` : `unit.${unit}`) as 'unit.piece');
}

export function buildQuoteMessage(q: QuoteRequest): string {
  const L = q.language;
  const t = (k: Parameters<typeof translate>[1]) => translate(L, k);
  const lines: string[] = [t('wa.greeting'), '', t('wa.intro'), ''];
  for (const it of q.items) lines.push(`- ${it.name} — ${it.quantity} ${unitLabel(L, it.unit, it.quantity)}`);
  if (!q.items.length) lines.push('-');
  lines.push('', t('wa.project'), translate(L, `project.${q.projectType}` as 'project.other'));
  lines.push('', t('wa.city'), q.city.trim());
  lines.push('', t('wa.delivery'), t(q.deliveryRequired ? 'quote.yes' : 'quote.no'));
  lines.push('', `${t('wa.name')} ${q.customerName.trim()}`, `${t('wa.phone')} ${q.phone.trim()}`);
  if (q.message.trim()) lines.push('', t('wa.message'), q.message.trim());
  lines.push('', t('wa.closing'));
  return lines.join('\n');
}

/** wa.me link. Without a configured number WhatsApp opens its contact picker. */
export function buildWhatsAppUrl(number: string | null, text: string): string {
  const enc = encodeURIComponent(text);
  return number ? `https://wa.me/${number}?text=${enc}` : `https://wa.me/?text=${enc}`;
}

/** Moroccan phone: 06/07/05 + 8 digits, or +212 / 00212 prefix. */
export function isValidMoroccanPhone(v: string): boolean {
  const d = v.replace(/[\s.\-()]/g, '');
  return /^(?:\+212|00212|0)[5-7]\d{8}$/.test(d);
}
