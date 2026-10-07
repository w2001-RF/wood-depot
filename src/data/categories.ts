import type { Category } from '../types';

export const categories: Category[] = [
  {
    id: 'construction',
    name: { fr: 'Construction', ar: 'البناء' },
    description: { fr: 'Madriers, planches, poutres, chevrons et bois de coffrage.', ar: 'ألواح، عوارض، روافد وخشب القوالب.' },
    zoneId: 'construction',
  },
  {
    id: 'agriculture',
    name: { fr: 'Agriculture', ar: 'الفلاحة' },
    description: { fr: 'Poteaux, perches, supports et traverses pour vos cultures.', ar: 'أعمدة، عصي، دعامات وعوارض لمزروعاتكم.' },
    zoneId: 'agriculture',
  },
  {
    id: 'greenhouse',
    name: { fr: 'Serres', ar: 'البيوت البلاستيكية' },
    description: { fr: 'Toutes les pièces de bois pour monter une serre agricole.', ar: 'جميع القطع الخشبية لتركيب بيت بلاستيكي.' },
    zoneId: 'greenhouse',
  },
  {
    id: 'seasonal',
    name: { fr: 'Saisonnier', ar: 'موسمي' },
    description: { fr: 'Charbon de bois en vrac et en sacs.', ar: 'فحم خشبي بالجملة وفي أكياس.' },
    zoneId: 'charcoal',
  },
];
