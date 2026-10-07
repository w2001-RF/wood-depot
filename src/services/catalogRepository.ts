import { appConfig } from '../config/env';
import { products as mockProducts } from '../data/products';
import { mockSettings } from '../data/settings';
import type { BusinessSettings, Product } from '../types';

/**
 * Data access boundary. UI never imports data files directly for live data;
 * swapping mock → Supabase is a configuration change (VITE_DATA_SOURCE=supabase).
 */
export interface CatalogRepository {
  kind: 'mock' | 'supabase';
  getProducts(): Promise<Product[]>;
  getSettings(): Promise<BusinessSettings | null>;
}

const mockRepository: CatalogRepository = {
  kind: 'mock',
  getProducts: async () => mockProducts,
  getSettings: async () => mockSettings,
};

/** Minimal PostgREST client (no SDK needed). Table shapes: see supabase/schema.sql */
function supabaseRepository(url: string, key: string): CatalogRepository {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, { headers });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return res.json() as Promise<T>;
  };
  return {
    kind: 'supabase',
    async getProducts() {
      type Row = Record<string, unknown>;
      const rows = await get<Row[]>('products?select=*&active=eq.true&order=sort_order');
      return rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        name: { fr: String(r.name_fr), ar: String(r.name_ar ?? r.name_fr) },
        description: { fr: String(r.description_fr ?? ''), ar: String(r.description_ar ?? r.description_fr ?? '') },
        category: r.category as Product['category'],
        dimensions: (r.dimensions as Product['dimensions']) ?? {},
        unit: (r.unit as Product['unit']) ?? 'piece',
        price: typeof r.price === 'number' ? r.price : null,
        priceType: r.price == null ? 'on_quote' : 'on_quote',
        stock: typeof r.stock === 'number' ? r.stock : null,
        availability: (r.availability as Product['availability']) ?? 'in_stock',
        image: (r.image_url as string) ?? null,
        model3d: (r.model3d_url as string) ?? null,
        usage: (r.usage as Product['usage']) ?? [],
        featured: !!r.featured,
        seasonal: !!r.seasonal,
        shape: (r.shape as Product['shape']) ?? 'board',
        woodTone: (r.wood_tone as Product['woodTone']) ?? 'pine',
        isDemo: false,
      }));
    },
    async getSettings() {
      const rows = await get<Record<string, unknown>[]>('business_settings?select=*&limit=1');
      const r = rows[0];
      if (!r) return null;
      return {
        ...mockSettings,
        businessName: String(r.business_name ?? mockSettings.businessName),
        phone: (r.phone as string) ?? null,
        whatsapp: (r.whatsapp as string) ?? mockSettings.whatsapp,
        latitude: (r.latitude as number) ?? null,
        longitude: (r.longitude as number) ?? null,
        seasonalMode: !!r.seasonal_mode,
        isDemo: false,
      };
    },
  };
}

export function getCatalogRepository(): CatalogRepository {
  if (appConfig.dataSource === 'supabase' && appConfig.supabaseUrl && appConfig.supabaseAnonKey)
    return supabaseRepository(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
  return mockRepository;
}
