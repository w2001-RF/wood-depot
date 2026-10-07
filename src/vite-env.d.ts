/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_BUSINESS_NAME?: string;
  readonly VITE_BUSINESS_PHONE?: string;
  readonly VITE_LATITUDE?: string;
  readonly VITE_LONGITUDE?: string;
  readonly VITE_SEASONAL_MODE?: string;
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
