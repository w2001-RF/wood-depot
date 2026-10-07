import { ArrowLeft, Check, Copy, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuotation, type QuoteErrors } from '../../hooks/useQuotation';
import { useT, type TKey } from '../../i18n';
import { unitLabel } from '../../services/whatsapp';
import { useUiStore } from '../../stores/uiStore';
import type { ProjectType } from '../../types';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

const PROJECTS: ProjectType[] = ['construction', 'greenhouse', 'formwork', 'agriculture', 'charcoal', 'other'];

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#6b4428]">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-semibold text-[#a3392b]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (err?: string) =>
  `h-12 w-full border bg-white px-3 text-[15px] outline-none focus:border-[#1f3a2e] focus:ring-2 focus:ring-[#1f3a2e]/20 ${err ? 'border-[#a3392b]' : 'border-[#3a2618]/25'}`;

export function QuoteModal() {
  const { t, lang } = useT();
  const open = useUiStore((s) => s.quoteOpen);
  const setOpen = useUiStore((s) => s.setQuoteOpen);
  const q = useQuotation();
  const [errors, setErrors] = useState<QuoteErrors>({});
  const [copied, setCopied] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    q.setSubmitted(null);
    setErrors({});
    setCopied(false);
    window.setTimeout(() => firstRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const err = (k: keyof QuoteErrors) => (errors[k] ? t(errors[k] as TKey) : undefined);
  const set = <K extends keyof typeof q.form>(k: K, v: (typeof q.form)[K]) => {
    q.setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await q.submit();
    if (!res.ok) {
      setErrors(res.errors);
      const first = Object.keys(res.errors)[0];
      document.getElementById(`q-${first}`)?.focus();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(q.message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="quote-title">
      <button type="button" className="wd-fade-in absolute inset-0 bg-[#120c08]/60" onClick={() => setOpen(false)} aria-label={t('cta.close')} />
      <div className="wd-sheet-in relative flex max-h-[100dvh] w-full max-w-2xl flex-col bg-[#f6f1e7] shadow-2xl sm:max-h-[92vh]">
        <header className="flex items-start justify-between gap-3 border-b border-[#3a2618]/10 px-5 py-4 sm:px-7">
          <div>
            <h2 id="quote-title" className="font-display text-3xl font-black uppercase tracking-wide">
              {t('quote.title')}
            </h2>
            <p className="mt-0.5 text-sm text-[#6b4428]">{q.submitted ? t('quote.ready') : t('quote.intro')}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center hover:bg-[#ecdfc8]" aria-label={t('cta.close')}>
            <X size={18} />
          </button>
        </header>

        {!q.submitted ? (
          <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
              <section aria-label={t('quote.items')} className="border border-[#3a2618]/15 bg-[#efe6d4] p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6b4428]">{t('quote.items')}</p>
                {q.quoteItems.length ? (
                  <ul className="mt-1.5 space-y-0.5 text-sm">
                    {q.quoteItems.map((i) => (
                      <li key={i.productId} className="flex justify-between gap-3">
                        <span>{i.name}</span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {i.quantity} {unitLabel(lang, i.unit, i.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-[#6b4428]">—</p>
                )}
                {errors.items && (
                  <p className="mt-1 text-xs font-semibold text-[#a3392b]" role="alert">
                    {t(errors.items as TKey)}
                  </p>
                )}
              </section>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="q-customerName" label={t('quote.name')} error={err('customerName')}>
                  <input ref={firstRef} id="q-customerName" autoComplete="name" value={q.form.customerName} onChange={(e) => set('customerName', e.target.value)} className={inputCls(err('customerName'))} aria-invalid={!!errors.customerName} />
                </Field>
                <Field id="q-phone" label={t('quote.phone')} error={err('phone')}>
                  <input id="q-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="06 12 34 56 78" value={q.form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls(err('phone'))} aria-invalid={!!errors.phone} />
                </Field>
                <Field id="q-city" label={t('quote.city')} error={err('city')}>
                  <input id="q-city" autoComplete="address-level2" placeholder={t('quote.cityPlaceholder')} value={q.form.city} onChange={(e) => set('city', e.target.value)} className={inputCls(err('city'))} aria-invalid={!!errors.city} />
                </Field>
                <Field id="q-projectType" label={t('quote.project')}>
                  <select id="q-projectType" value={q.form.projectType} onChange={(e) => set('projectType', e.target.value as ProjectType)} className={inputCls()}>
                    {PROJECTS.map((p) => (
                      <option key={p} value={p}>
                        {t(`project.${p}` as 'project.other')}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <fieldset>
                <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6b4428]">{t('quote.delivery')}</legend>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <label key={String(v)} className={`flex h-11 flex-1 cursor-pointer items-center justify-center border text-sm font-semibold ${q.form.deliveryRequired === v ? 'border-[#1f3a2e] bg-[#1f3a2e] text-[#f6f1e7]' : 'border-[#3a2618]/25 bg-white'}`}>
                      <input type="radio" name="delivery" className="sr-only" checked={q.form.deliveryRequired === v} onChange={() => set('deliveryRequired', v)} />
                      {v ? t('quote.yes') : t('quote.no')}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field id="q-message" label={t('quote.message')}>
                <textarea id="q-message" rows={3} value={q.form.message} onChange={(e) => set('message', e.target.value)} className="w-full border border-[#3a2618]/25 bg-white px-3 py-2 text-[15px] outline-none focus:border-[#1f3a2e] focus:ring-2 focus:ring-[#1f3a2e]/20" />
              </Field>
            </div>
            <footer className="border-t border-[#3a2618]/10 bg-[#efe6d4] px-5 py-4 sm:px-7" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 bg-[#1f3a2e] text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#2f5a45]">
                <WhatsAppIcon className="h-4 w-4" />
                {t('quote.prepare')}
              </button>
            </footer>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b4428]">{t('quote.preview')}</p>
              <div className="relative mt-2 bg-[#e3dccd] p-4">
                <pre dir="auto" className="ms-auto max-w-[92%] whitespace-pre-wrap bg-[#dcf2c8] p-3 font-sans text-[14px] leading-relaxed text-[#1c1c1c] shadow-sm" data-testid="wa-message">
                  {q.message}
                </pre>
              </div>
              {!q.hasNumber && (
                <p className="mt-3 flex gap-2 text-xs text-[#6b4428]">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  {t('quote.noNumber')}
                </p>
              )}
              <p className="mt-2 text-[11px] text-[#6b4428]/80">Réf. {q.submitted.id}</p>
            </div>
            <footer className="grid gap-2 border-t border-[#3a2618]/10 bg-[#efe6d4] px-5 py-4 sm:grid-cols-[auto_auto_1fr] sm:px-7" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button type="button" onClick={() => q.setSubmitted(null)} className="flex h-12 items-center justify-center gap-2 border border-[#3a2618]/25 px-4 text-sm font-semibold hover:bg-[#ecdfc8]">
                <ArrowLeft size={16} className="rtl:rotate-180" /> {t('quote.edit')}
              </button>
              <button type="button" onClick={copy} className="flex h-12 items-center justify-center gap-2 border border-[#3a2618]/25 px-4 text-sm font-semibold hover:bg-[#ecdfc8]">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('cta.copied') : t('cta.copy')}
              </button>
              <a href={q.url} target="_blank" rel="noopener noreferrer" data-testid="wa-link" className="flex h-12 items-center justify-center gap-2 bg-[#1f7a4d] px-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#19693f]">
                <WhatsAppIcon className="h-5 w-5" /> {t('cta.sendWhatsapp')}
              </a>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
