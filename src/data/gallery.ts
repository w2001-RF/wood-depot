export type GalleryCategory = 'depot' | 'wood' | 'construction' | 'agriculture' | 'greenhouse' | 'delivery';

export interface GalleryItem {
  id: string;
  category: GalleryCategory;
  /** Real photo URL. null = demo illustration until the business supplies photos. */
  src: string | null;
  caption: { fr: string; ar: string };
}

export const galleryItems: GalleryItem[] = [
  { id: 'g1', category: 'depot', src: null, caption: { fr: 'Allées de stockage', ar: 'ممرات التخزين' } },
  { id: 'g2', category: 'wood', src: null, caption: { fr: 'Piles de madriers', ar: 'أكوام الألواح' } },
  { id: 'g3', category: 'construction', src: null, caption: { fr: 'Coffrage de chantier', ar: 'قوالب الورش' } },
  { id: 'g4', category: 'agriculture', src: null, caption: { fr: 'Palissage en verger', ar: 'تعريش في البستان' } },
  { id: 'g5', category: 'greenhouse', src: null, caption: { fr: 'Structure de serre', ar: 'هيكل بيت بلاستيكي' } },
  { id: 'g6', category: 'delivery', src: null, caption: { fr: 'Chargement camion', ar: 'تحميل الشاحنة' } },
];
