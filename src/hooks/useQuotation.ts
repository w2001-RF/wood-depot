import { useMemo, useState } from 'react';
import { appConfig } from '../config/env';
import { newQuoteId, quoteRepository } from '../services/quoteService';
import { buildQuoteMessage, buildWhatsAppUrl, isValidMoroccanPhone } from '../services/whatsapp';
import { useCartStore } from '../stores/cartStore';
import { useCatalogStore } from '../stores/catalogStore';
import { useUiStore } from '../stores/uiStore';
import type { ProjectType, QuoteRequest } from '../types';

export interface QuoteForm {
  customerName: string;
  phone: string;
  city: string;
  deliveryRequired: boolean;
  projectType: ProjectType;
  message: string;
}

export type QuoteErrors = Partial<Record<keyof QuoteForm | 'items', string>>;

/** Form state, validation and WhatsApp hand-off for a quote request. */
export function useQuotation() {
  const lang = useUiStore((s) => s.lang);
  const items = useCartStore((s) => s.items);
  const byId = useCatalogStore((s) => s.byId);
  const settings = useCatalogStore((s) => s.settings);
  const [form, setForm] = useState<QuoteForm>({ customerName: '', phone: '', city: '', deliveryRequired: true, projectType: 'construction', message: '' });
  const [submitted, setSubmitted] = useState<QuoteRequest | null>(null);

  const quoteItems = useMemo(
    () =>
      items
        .map((i) => {
          const p = byId[i.productId];
          return p ? { productId: p.id, name: p.name[lang], quantity: i.quantity, unit: p.unit } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [items, byId, lang],
  );

  const validate = (f: QuoteForm): QuoteErrors => {
    const e: QuoteErrors = {};
    if (f.customerName.trim().length < 2) e.customerName = 'quote.err.name';
    if (!isValidMoroccanPhone(f.phone)) e.phone = 'quote.err.phone';
    if (f.city.trim().length < 2) e.city = 'quote.err.city';
    if (!quoteItems.length && f.message.trim().length < 5) e.items = 'quote.err.items';
    return e;
  };

  const number = settings.whatsapp ?? appConfig.whatsappNumber;

  const submit = async (): Promise<{ ok: true; request: QuoteRequest } | { ok: false; errors: QuoteErrors }> => {
    const errors = validate(form);
    if (Object.keys(errors).length) return { ok: false, errors };
    const request: QuoteRequest = {
      id: newQuoteId(),
      ...form,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      items: quoteItems,
      createdAt: new Date().toISOString(),
      language: lang,
    };
    try {
      await quoteRepository.save(request);
    } catch (err) {
      console.warn('[quote] could not persist, WhatsApp hand-off still works', err);
    }
    setSubmitted(request);
    return { ok: true, request };
  };

  const message = submitted ? buildQuoteMessage(submitted) : '';
  const url = submitted ? buildWhatsAppUrl(number, message) : '';

  return { form, setForm, quoteItems, submit, submitted, setSubmitted, message, url, hasNumber: !!number, validate };
}
