import type { Product } from '../types';

/**
 * DEMO catalogue. Dimensions are common trade sizes; prices are intentionally
 * absent ("Sur devis") and stock figures are illustrative. Replace through the
 * repository layer (services/catalogRepository.ts) when real data is available.
 */
type Seed = Omit<Product, 'slug' | 'price' | 'priceType' | 'image' | 'model3d' | 'isDemo'> &
  Partial<Pick<Product, 'image' | 'model3d'>>;

const seeds: Seed[] = [
  // ---------------- CONSTRUCTION ----------------
  {
    id: 'madrier',
    name: { fr: 'Madrier bois', ar: 'لوح خشبي سميك (مادرييه)' },
    category: 'construction',
    description: {
      fr: 'Pièce de bois résineux robuste pour la construction, le coffrage et les structures provisoires.',
      ar: 'قطعة خشب صنوبري متينة للبناء والقوالب والهياكل المؤقتة.',
    },
    dimensions: { lengthM: 4, widthCm: 10, thicknessCm: 5 },
    unit: 'piece', stock: 640, availability: 'in_stock',
    usage: ['construction', 'formwork', 'structure'], featured: true, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  {
    id: 'planche',
    name: { fr: 'Planche bois', ar: 'لوح خشبي' },
    category: 'construction',
    description: {
      fr: 'Planche polyvalente pour platelages, échafaudages légers et travaux de chantier.',
      ar: 'لوح متعدد الاستعمالات للأرضيات والسقالات الخفيفة وأشغال الورش.',
    },
    dimensions: { lengthM: 4, widthCm: 20, thicknessCm: 2.7 },
    unit: 'piece', stock: 900, availability: 'in_stock',
    usage: ['construction', 'formwork'], featured: true, seasonal: false, shape: 'board', woodTone: 'fir',
  },
  {
    id: 'chevron',
    name: { fr: 'Chevron', ar: 'رافدة خشبية (شفرون)' },
    category: 'construction',
    description: {
      fr: 'Section carrée pour charpente légère, toiture et raidisseurs de coffrage.',
      ar: 'مقطع مربع للهياكل الخفيفة والأسقف وتقوية القوالب.',
    },
    dimensions: { lengthM: 4, widthCm: 8, thicknessCm: 6 },
    unit: 'piece', stock: 520, availability: 'in_stock',
    usage: ['framing', 'roofing', 'formwork'], featured: false, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  {
    id: 'bastaing',
    name: { fr: 'Bastaing', ar: 'لوح بستان' },
    category: 'construction',
    description: {
      fr: 'Bois de section intermédiaire pour solives, chevêtres et ossatures.',
      ar: 'خشب بمقطع متوسط للعوارض والهياكل.',
    },
    dimensions: { lengthM: 4, widthCm: 16, thicknessCm: 6.5 },
    unit: 'piece', stock: 210, availability: 'limited',
    usage: ['structure', 'framing'], featured: false, seasonal: false, shape: 'board', woodTone: 'fir',
  },
  {
    id: 'poutre',
    name: { fr: 'Poutre bois', ar: 'عارضة خشبية' },
    category: 'construction',
    description: {
      fr: 'Poutre de forte section pour portées, linteaux et structures porteuses.',
      ar: 'عارضة كبيرة المقطع للأحمال والسقوف والهياكل الحاملة.',
    },
    dimensions: { lengthM: 5, widthCm: 20, thicknessCm: 10 },
    unit: 'piece', stock: 120, availability: 'in_stock',
    usage: ['structure', 'framing', 'construction'], featured: true, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  {
    id: 'bois-charpente',
    name: { fr: 'Bois de charpente', ar: 'خشب الهياكل' },
    category: 'construction',
    description: {
      fr: 'Bois de structure de grande longueur pour charpentes et hangars.',
      ar: 'خشب هيكلي طويل للسقوف والمستودعات.',
    },
    dimensions: { lengthM: 6, widthCm: 22, thicknessCm: 7.5 },
    unit: 'piece', stock: 80, availability: 'limited',
    usage: ['structure', 'roofing', 'framing'], featured: false, seasonal: false, shape: 'board', woodTone: 'eucalyptus',
  },
  {
    id: 'bois-coffrage',
    name: { fr: 'Bois de coffrage', ar: 'خشب القوالب (كوفراج)' },
    category: 'construction',
    description: {
      fr: 'Planches brutes destinées aux coffrages de dalles, poteaux et voiles béton.',
      ar: 'ألواح خام مخصصة لقوالب البلاطات والأعمدة والجدران الخرسانية.',
    },
    dimensions: { lengthM: 4, widthCm: 25, thicknessCm: 2.5 },
    unit: 'piece', stock: 1100, availability: 'in_stock',
    usage: ['formwork', 'construction'], featured: true, seasonal: false, shape: 'board', woodTone: 'fir',
  },
  // ---------------- AGRICULTURE ----------------
  {
    id: 'poteau-agricole',
    name: { fr: 'Poteau agricole', ar: 'عمود فلاحي' },
    category: 'agriculture',
    description: {
      fr: 'Poteau rond pour palissage, vergers, vignes et clôtures agricoles.',
      ar: 'عمود دائري لتعريش الأشجار والكروم والأسوار الفلاحية.',
    },
    dimensions: { lengthM: 2.5, diameterCm: 10 },
    unit: 'piece', stock: 1500, availability: 'in_stock',
    usage: ['agriculture', 'trellis', 'fencing'], featured: true, seasonal: false, shape: 'round', woodTone: 'eucalyptus',
  },
  {
    id: 'perche-bois',
    name: { fr: 'Perche en bois', ar: 'عصا خشبية طويلة' },
    category: 'agriculture',
    description: {
      fr: 'Perche fine et légère pour tuteurage et ombrières.',
      ar: 'عصا رفيعة وخفيفة لتدعيم النباتات والمظلات.',
    },
    dimensions: { lengthM: 3, diameterCm: 7 },
    unit: 'piece', stock: 2000, availability: 'in_stock',
    usage: ['agriculture', 'trellis'], featured: false, seasonal: false, shape: 'round', woodTone: 'eucalyptus',
  },
  {
    id: 'support-agricole',
    name: { fr: 'Support agricole', ar: 'دعامة فلاحية' },
    category: 'agriculture',
    description: {
      fr: 'Support court pour jeunes plants, arbres fruitiers et cultures maraîchères.',
      ar: 'دعامة قصيرة للشتلات والأشجار المثمرة والخضروات.',
    },
    dimensions: { lengthM: 1.8, widthCm: 5, thicknessCm: 5 },
    unit: 'piece', stock: 3000, availability: 'in_stock',
    usage: ['agriculture', 'trellis'], featured: false, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  {
    id: 'traverse-agricole',
    name: { fr: 'Traverse agricole', ar: 'عارضة فلاحية' },
    category: 'agriculture',
    description: {
      fr: 'Traverse horizontale pour palissages en T, clôtures et enclos.',
      ar: 'عارضة أفقية للتعريش على شكل T والأسوار والحظائر.',
    },
    dimensions: { lengthM: 3, widthCm: 8, thicknessCm: 4 },
    unit: 'piece', stock: 800, availability: 'in_stock',
    usage: ['agriculture', 'fencing', 'trellis'], featured: false, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  {
    id: 'bois-structure-agricole',
    name: { fr: 'Bois de structure agricole', ar: 'خشب هيكلي فلاحي' },
    category: 'agriculture',
    description: {
      fr: 'Section carrée pour abris, hangars agricoles et étables.',
      ar: 'مقطع مربع للملاجئ والمستودعات الفلاحية والإسطبلات.',
    },
    dimensions: { lengthM: 4, widthCm: 10, thicknessCm: 10 },
    unit: 'piece', stock: 260, availability: 'in_stock',
    usage: ['agriculture', 'structure'], featured: false, seasonal: false, shape: 'board', woodTone: 'eucalyptus',
  },
  // ---------------- GREENHOUSE ----------------
  {
    id: 'poteau-serre',
    name: { fr: 'Poteau de serre', ar: 'عمود البيت البلاستيكي' },
    category: 'greenhouse',
    description: {
      fr: 'Poteau rond calibré pour les montants latéraux des serres agricoles.',
      ar: 'عمود دائري معاير للقوائم الجانبية للبيوت البلاستيكية.',
    },
    dimensions: { lengthM: 3.5, diameterCm: 12 },
    unit: 'piece', stock: 700, availability: 'in_stock',
    usage: ['greenhouse', 'structure'], featured: true, seasonal: false, shape: 'round', woodTone: 'eucalyptus',
  },
  {
    id: 'support-serre',
    name: { fr: 'Support de serre', ar: 'دعامة البيت البلاستيكي' },
    category: 'greenhouse',
    description: {
      fr: 'Montant central qui soutient le faîtage de la serre.',
      ar: 'قائم مركزي يحمل قمة البيت البلاستيكي.',
    },
    dimensions: { lengthM: 3, widthCm: 8, thicknessCm: 8 },
    unit: 'piece', stock: 340, availability: 'in_stock',
    usage: ['greenhouse', 'structure'], featured: false, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  {
    id: 'piece-structure-serre',
    name: { fr: 'Pièce de structure de serre', ar: 'قطعة هيكل البيت البلاستيكي' },
    category: 'greenhouse',
    description: {
      fr: 'Pièce inclinée formant les versants de toiture de la serre.',
      ar: 'قطعة مائلة تشكل منحدرات سقف البيت البلاستيكي.',
    },
    dimensions: { lengthM: 4, widthCm: 6, thicknessCm: 4 },
    unit: 'piece', stock: 450, availability: 'in_stock',
    usage: ['greenhouse', 'roofing'], featured: false, seasonal: false, shape: 'board', woodTone: 'fir',
  },
  {
    id: 'traverse-serre',
    name: { fr: 'Traverse de serre', ar: 'عارضة البيت البلاستيكي' },
    category: 'greenhouse',
    description: {
      fr: 'Traverse longitudinale reliant les fermes de la serre.',
      ar: 'عارضة طولية تربط هياكل البيت البلاستيكي.',
    },
    dimensions: { lengthM: 5, widthCm: 7, thicknessCm: 4 },
    unit: 'piece', stock: 380, availability: 'limited',
    usage: ['greenhouse', 'structure'], featured: false, seasonal: false, shape: 'board', woodTone: 'fir',
  },
  {
    id: 'renfort-serre',
    name: { fr: 'Renfort de serre', ar: 'تقوية البيت البلاستيكي' },
    category: 'greenhouse',
    description: {
      fr: 'Pièce de contreventement posée en diagonale aux angles de la serre.',
      ar: 'قطعة تدعيم قطرية توضع في زوايا البيت البلاستيكي.',
    },
    dimensions: { lengthM: 1.5, widthCm: 6, thicknessCm: 6 },
    unit: 'piece', stock: 500, availability: 'in_stock',
    usage: ['greenhouse', 'bracing'], featured: false, seasonal: false, shape: 'board', woodTone: 'pine',
  },
  // ---------------- SEASONAL ----------------
  {
    id: 'charbon-vrac',
    name: { fr: 'Charbon de bois en vrac', ar: 'فحم خشبي بالجملة' },
    category: 'seasonal',
    description: {
      fr: 'Charbon de bois vendu au kilo, pour grillades et restauration.',
      ar: 'فحم خشبي يباع بالكيلوغرام للشواء والمطاعم.',
    },
    dimensions: {},
    unit: 'kg', stock: null, availability: 'seasonal',
    usage: ['barbecue', 'catering'], featured: false, seasonal: true, shape: 'bulk', woodTone: 'charcoal',
  },
  {
    id: 'sac-charbon-5',
    name: { fr: 'Sac de charbon 5 kg', ar: 'كيس فحم 5 كلغ' },
    category: 'seasonal',
    description: {
      fr: 'Sac pratique pour les particuliers et les fêtes en famille.',
      ar: 'كيس عملي للأسر والمناسبات العائلية.',
    },
    dimensions: { weightKg: 5 },
    unit: 'bag', stock: null, availability: 'seasonal',
    usage: ['barbecue'], featured: false, seasonal: true, shape: 'bag', woodTone: 'charcoal',
  },
  {
    id: 'sac-charbon-15',
    name: { fr: 'Sac de charbon 15 kg', ar: 'كيس فحم 15 كلغ' },
    category: 'seasonal',
    description: {
      fr: 'Grand sac pour restaurateurs, traiteurs et grandes occasions.',
      ar: 'كيس كبير للمطاعم ومموني الحفلات والمناسبات الكبرى.',
    },
    dimensions: { weightKg: 15 },
    unit: 'bag', stock: null, availability: 'seasonal',
    usage: ['barbecue', 'catering'], featured: true, seasonal: true, shape: 'bag', woodTone: 'charcoal',
  },
];

export const products: Product[] = seeds.map((s) => ({
  image: null,
  model3d: null,
  ...s,
  slug: s.id,
  price: null,
  priceType: 'on_quote',
  isDemo: true,
}));
