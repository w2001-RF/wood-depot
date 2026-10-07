export type Lang = 'fr' | 'ar';
export type LocalizedText = Record<Lang, string>;

export type CategoryId = 'construction' | 'agriculture' | 'greenhouse' | 'seasonal';
export type UsageId =
  | 'construction'
  | 'formwork'
  | 'structure'
  | 'framing'
  | 'roofing'
  | 'agriculture'
  | 'trellis'
  | 'fencing'
  | 'greenhouse'
  | 'bracing'
  | 'barbecue'
  | 'catering';
export type Availability = 'in_stock' | 'limited' | 'on_order' | 'seasonal';
export type PriceType = 'on_quote' | 'demo';
/** How the product is drawn procedurally (3D + illustration). */
export type ProductShape = 'board' | 'round' | 'bag' | 'bulk';
export type ProductUnit = 'piece' | 'bag' | 'kg';
export type WoodTone = 'pine' | 'fir' | 'eucalyptus' | 'charcoal';

export interface ProductDimensions {
  lengthM?: number;
  widthCm?: number;
  thicknessCm?: number;
  diameterCm?: number;
  weightKg?: number;
}

export interface Product {
  id: string;
  name: LocalizedText;
  slug: string;
  category: CategoryId;
  description: LocalizedText;
  dimensions: ProductDimensions;
  unit: ProductUnit;
  /** Never a real price in demo data. null = "Sur devis". */
  price: number | null;
  priceType: PriceType;
  stock: number | null;
  availability: Availability;
  image: string | null;
  model3d: string | null;
  usage: UsageId[];
  featured: boolean;
  seasonal: boolean;
  shape: ProductShape;
  woodTone: WoodTone;
  /** true while the record comes from the demo data set */
  isDemo: boolean;
}

export type ZoneId = 'entrance' | 'construction' | 'agriculture' | 'greenhouse' | 'charcoal' | 'loading' | 'desk' | 'yard';

export interface Category {
  id: CategoryId;
  name: LocalizedText;
  description: LocalizedText;
  zoneId: ZoneId;
}

export interface OpeningHoursEntry {
  days: LocalizedText;
  hours: string | null;
}

export interface BusinessSettings {
  businessName: string;
  phone: string | null;
  whatsapp: string | null;
  address: LocalizedText;
  latitude: number | null;
  longitude: number | null;
  openingHours: OpeningHoursEntry[];
  logo: string | null;
  coverImage: string | null;
  seasonalMode: boolean;
  /** true when name / contact fields are demo placeholders */
  isDemo: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type ProjectType = 'construction' | 'greenhouse' | 'formwork' | 'agriculture' | 'charcoal' | 'other';

export interface QuoteItem {
  productId: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
}

export interface QuoteRequest {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  deliveryRequired: boolean;
  projectType: ProjectType;
  items: QuoteItem[];
  message: string;
  createdAt: string;
  language: Lang;
}

export type Route = 'home' | 'depot' | 'catalog' | 'solutions' | 'configurator' | 'about' | 'contact';
export type QualityLevel = 'high' | 'medium' | 'low';
