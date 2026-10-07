import type { QuoteRequest } from '../types';

/**
 * Persistence boundary for quote requests. v1 keeps them in memory; a Supabase
 * implementation inserts into `quote_requests` (see supabase/schema.sql).
 */
export interface QuoteRepository {
  save(q: QuoteRequest): Promise<void>;
}

const memory: QuoteRequest[] = [];

export const quoteRepository: QuoteRepository = {
  async save(q) {
    memory.push(q);
  },
};

export function newQuoteId(): string {
  const r = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${r}`;
}
