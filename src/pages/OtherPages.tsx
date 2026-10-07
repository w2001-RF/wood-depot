import { Clock, MapPin, MessageSquare, Navigation, Phone, Truck, Users } from 'lucide-react';
import { ProjectConfigurator } from '../components/configurator/ProjectConfigurator';
import { useWhatsAppHref } from '../components/navigation/Header';
import { Gallery } from '../components/ui/Gallery';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { useT } from '../i18n';
import { useCatalogStore } from '../stores/catalogStore';

export function ConfiguratorPage() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <h1 className="font-display text-6xl font-black uppercase leading-none tracking-wide">{t('config.title')}</h1>
      <p className="mb-10 mt-2 text-[#6b4428]">{t('config.subtitle')}</p>
      <ProjectConfigurator />
    </div>
  );
}

export function AboutPage() {
  const { t } = useT();
  const values = [
    { i: Users, t: 'about.v1.t', d: 'about.v1.d' },
    { i: MessageSquare, t: 'about.v2.t', d: 'about.v2.d' },
    { i: Truck, t: 'about.v3.t', d: 'about.v3.d' },
  ] as const;
  return (
    <div className="pb-20 pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-6xl font-black uppercase leading-none tracking-wide">{t('about.title')}</h1>
        <p className="mt-6 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-4xl">{t('about.lead')}</p>
        <p className="mt-4 max-w-2xl text-[#6b4428]">{t('about.body')}</p>
        <div className="mt-12 grid gap-px border border-[#3a2618]/15 bg-[#3a2618]/15 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.t} className="bg-[#f6f1e7] p-6">
              <v.i size={24} className="text-[#6b4428]" />
              <h2 className="mt-4 font-display text-2xl font-extrabold uppercase">{t(v.t)}</h2>
              <p className="mt-1 text-sm text-[#6b4428]">{t(v.d)}</p>
            </div>
          ))}
        </div>
        <h2 className="mt-16 font-display text-4xl font-black uppercase">{t('home.gallery')}</h2>
        <div className="mt-6">
          <Gallery />
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { t, l } = useT();
  const settings = useCatalogStore((s) => s.settings);
  const wa = useWhatsAppHref();
  const hasCoords = settings.latitude != null && settings.longitude != null;
  const q = hasCoords ? `${settings.latitude},${settings.longitude}` : 'Sidi Yahya El Gharb, Maroc';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <h1 className="font-display text-6xl font-black uppercase leading-none tracking-wide">{t('contact.title')}</h1>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="relative min-h-[320px] overflow-hidden border border-[#3a2618]/15 bg-[#e3d6bd]">
          {hasCoords ? (
            <iframe
              title={t('contact.title')}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${settings.longitude! - 0.01},${settings.latitude! - 0.006},${settings.longitude! + 0.01},${settings.latitude! + 0.006}&marker=${settings.latitude},${settings.longitude}`}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="xMidYMid slice" aria-hidden>
                {Array.from({ length: 12 }, (_, i) => (
                  <path key={i} d={`M0 ${i * 28} Q200 ${i * 28 + (i % 2 ? 20 : -20)} 400 ${i * 28 + 8}`} stroke="#b89a72" fill="none" />
                ))}
                <path d="M0 180 L400 120" stroke="#8a7a62" strokeWidth="6" />
              </svg>
              <div className="relative">
                <MapPin size={40} className="mx-auto text-[#1f3a2e]" />
                <p className="mt-2 font-display text-2xl font-black uppercase">Sidi Yahya El Gharb</p>
                <p className="mx-auto mt-2 max-w-sm text-xs text-[#6b4428]">{t('contact.coordsMissing')}</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">
              <MapPin size={14} /> {t('contact.address')}
            </p>
            <p className="mt-1 text-lg font-semibold">{l(settings.address)}</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">
              <Phone size={14} /> {t('contact.phone')}
            </p>
            <p className="mt-1 text-lg font-semibold" dir="ltr">
              {settings.phone ?? t('contact.toConfirm')}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b4428]">
              <Clock size={14} /> {t('contact.hours')}
            </p>
            <dl className="mt-1 space-y-1">
              {settings.openingHours.map((h) => (
                <div key={h.days.fr} className="flex justify-between gap-4 border-b border-[#3a2618]/10 py-1 text-sm">
                  <dt>{l(h.days)}</dt>
                  <dd className="font-semibold">{h.hours ?? t('contact.toConfirm')}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid gap-2 pt-2 sm:grid-cols-2">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 bg-[#1f3a2e] text-sm font-bold uppercase tracking-wider text-[#f6f1e7] hover:bg-[#2f5a45]">
              <WhatsAppIcon className="h-5 w-5" /> {t('cta.whatsapp')}
            </a>
            <a href={dirUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 border border-[#3a2618]/30 text-sm font-bold uppercase tracking-wider hover:bg-[#ecdfc8]">
              <Navigation size={16} /> {t('contact.directions')}
            </a>
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block text-sm underline underline-offset-4">
            {t('contact.openMaps')}
          </a>
        </div>
      </div>
    </div>
  );
}
