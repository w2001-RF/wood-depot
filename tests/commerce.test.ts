import { describe, expect, it } from 'vitest';
import { products } from '../src/data/products';
import { estimate } from '../src/services/configurator';
import { searchProducts } from '../src/services/search';
import { buildQuoteMessage, buildWhatsAppUrl, isValidMoroccanPhone } from '../src/services/whatsapp';
import type { QuoteRequest } from '../src/types';

const q: QuoteRequest = {
  id: 'DV-1',
  customerName: 'Youssef',
  phone: '0612345678',
  city: 'Sidi Slimane',
  deliveryRequired: true,
  projectType: 'construction',
  items: [
    { productId: 'madrier', name: 'Madrier bois', quantity: 20, unit: 'piece' },
    { productId: 'poteau-agricole', name: 'Poteau agricole', quantity: 1, unit: 'piece' },
  ],
  message: '',
  createdAt: '2026-10-07T00:00:00Z',
  language: 'fr',
};

describe('WhatsApp quote', () => {
  it('lists items with plural-aware units and the spec structure', () => {
    const m = buildQuoteMessage(q);
    expect(m).toContain('Je souhaite demander un devis pour :');
    expect(m).toContain('- Madrier bois — 20 pièces');
    expect(m).toContain('- Poteau agricole — 1 pièce');
    expect(m).toContain('Ville :\nSidi Slimane');
    expect(m).toContain('Livraison :\nOui');
    expect(m.trim().endsWith("Merci de m'indiquer le prix et la disponibilité.")).toBe(true);
  });
  it('writes the message in Arabic when the visitor browses in Arabic', () => {
    expect(buildQuoteMessage({ ...q, language: 'ar' })).toContain('أرغب في طلب عرض سعر');
  });
  it('encodes the message and falls back to the contact picker without a number', () => {
    expect(buildWhatsAppUrl('212600000000', 'a b')).toBe('https://wa.me/212600000000?text=a%20b');
    expect(buildWhatsAppUrl(null, 'x')).toBe('https://wa.me/?text=x');
  });
  it('validates Moroccan numbers', () => {
    for (const ok of ['06 12 34 56 78', '0712345678', '+212 6 12 34 56 78', '00212512345678']) expect(isValidMoroccanPhone(ok), ok).toBe(true);
    for (const bad of ['12345', '0812345678', '06123', '']) expect(isValidMoroccanPhone(bad), bad).toBe(false);
  });
});

describe('configurator', () => {
  it('estimates a 10×5 m vegetable greenhouse with every greenhouse product', () => {
    const lines = estimate({ type: 'greenhouse', lengthM: 10, widthM: 5, heightM: 3, usage: 'vegetables' });
    const ids = lines.map((l) => l.productId).sort();
    expect(ids).toEqual(['piece-structure-serre', 'poteau-serre', 'renfort-serre', 'support-serre', 'traverse-serre']);
    expect(lines.find((l) => l.productId === 'poteau-serre')!.quantity).toBe(12); // 6 frames × 2 sides
    expect(lines.every((l) => Number.isInteger(l.quantity) && l.quantity > 0)).toBe(true);
  });
  it('only references products that exist', () => {
    const ids = new Set(products.map((p) => p.id));
    const inputs = [
      { type: 'formwork', areaM2: 40, element: 'wall' },
      { type: 'construction', lengthM: 8, widthM: 6, roof: 'pitched' },
      { type: 'agriculture', rowLengthM: 50, rows: 4, spacingM: 3, system: 'fence' },
    ] as const;
    for (const i of inputs) for (const l of estimate(i)) expect(ids.has(l.productId), l.productId).toBe(true);
  });
});

describe('search', () => {
  it('is accent-insensitive and finds Arabic names', () => {
    expect(searchProducts(products, 'MADRIER', 'fr')[0].id).toBe('madrier');
    expect(searchProducts(products, 'poteau agri', 'fr')[0].id).toBe('poteau-agricole');
    expect(searchProducts(products, 'fahm', 'fr')).toHaveLength(0);
    expect(searchProducts(products, 'فحم', 'ar').length).toBeGreaterThan(0);
    expect(searchProducts(products, 'serre', 'fr').every((p) => p.category === 'greenhouse' || p.usage.includes('greenhouse'))).toBe(true);
  });
});

describe('demo data honesty', () => {
  it('never ships an invented price', () => {
    for (const p of products) {
      expect(p.price, p.id).toBeNull();
      expect(p.priceType).toBe('on_quote');
      expect(p.isDemo).toBe(true);
    }
  });
});
