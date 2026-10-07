import { appConfig } from '../config/env';
import type { BusinessSettings } from '../types';

/** Business settings built from configuration. Unknown facts stay null (shown as "À confirmer"). */
export const mockSettings: BusinessSettings = {
  businessName: appConfig.businessName,
  phone: appConfig.phone,
  whatsapp: appConfig.whatsappNumber,
  address: { fr: 'Sidi Yahya El Gharb, Maroc', ar: 'سيدي يحيى الغرب، المغرب' },
  latitude: appConfig.latitude,
  longitude: appConfig.longitude,
  openingHours: [
    { days: { fr: 'Lundi – Samedi', ar: 'الإثنين – السبت' }, hours: null },
    { days: { fr: 'Dimanche', ar: 'الأحد' }, hours: null },
  ],
  logo: null,
  coverImage: null,
  seasonalMode: appConfig.seasonalMode,
  isDemo: appConfig.businessNameIsDemo,
};
