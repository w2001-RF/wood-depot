/**
 * Single source of runtime configuration. Every component reads business
 * contact data through here (never hard-coded elsewhere).
 */
const env = import.meta.env;

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function sanitizePhone(v: string | undefined | null): string | null {
  if (!v) return null;
  const digits = v.replace(/[^\d]/g, '');
  return digits.length >= 9 ? digits : null;
}

export const appConfig = {
  whatsappNumber: sanitizePhone(env.VITE_WHATSAPP_NUMBER),
  businessName: (env.VITE_BUSINESS_NAME as string | undefined) || 'Wood Depot',
  businessNameIsDemo: !env.VITE_BUSINESS_NAME,
  phone: (env.VITE_BUSINESS_PHONE as string | undefined) || null,
  latitude: num(env.VITE_LATITUDE),
  longitude: num(env.VITE_LONGITUDE),
  seasonalMode: env.VITE_SEASONAL_MODE === 'true',
  dataSource: env.VITE_DATA_SOURCE === 'supabase' ? ('supabase' as const) : ('mock' as const),
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) || null,
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) || null,
};
