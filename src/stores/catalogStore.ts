import { create } from 'zustand';
import { categories as mockCategories } from '../data/categories';
import { products as mockProducts } from '../data/products';
import { mockSettings } from '../data/settings';
import { getCatalogRepository } from '../services/catalogRepository';
import type { BusinessSettings, Category, Product } from '../types';

interface CatalogState {
  products: Product[];
  byId: Record<string, Product>;
  categories: Category[];
  settings: BusinessSettings;
  status: 'ready' | 'loading' | 'error';
  source: 'mock' | 'supabase';
  load: () => Promise<void>;
}

const index = (list: Product[]) => Object.fromEntries(list.map((p) => [p.id, p]));

/**
 * Single product source for 3D depot, catalog, search, cart and quotes.
 * Starts with the mock data synchronously, then refreshes from the configured repository.
 */
export const useCatalogStore = create<CatalogState>()((set) => ({
  products: mockProducts,
  byId: index(mockProducts),
  categories: mockCategories,
  settings: mockSettings,
  status: 'ready',
  source: 'mock',
  load: async () => {
    const repo = getCatalogRepository();
    if (repo.kind === 'mock') return;
    set({ status: 'loading' });
    try {
      const [products, settings] = await Promise.all([repo.getProducts(), repo.getSettings()]);
      if (products.length) set({ products, byId: index(products), settings: settings ?? mockSettings, source: repo.kind });
      set({ status: 'ready' });
    } catch (e) {
      console.warn('[catalog] remote load failed, keeping demo data', e);
      set({ status: 'error' });
    }
  },
}));
