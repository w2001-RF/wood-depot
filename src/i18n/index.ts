import { useCallback } from 'react';
import { useUiStore } from '../stores/uiStore';
import type { Lang, LocalizedText } from '../types';
import { ar } from './ar';
import { fr, type TKey } from './fr';

const dicts = { fr, ar };

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = dicts[lang][key] ?? fr[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useT() {
  const lang = useUiStore((s) => s.lang);
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const l = useCallback((text: LocalizedText) => text[lang] || text.fr, [lang]);
  return { t, l, lang };
}

export type { TKey };
