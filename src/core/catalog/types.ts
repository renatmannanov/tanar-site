import type {
  ProductCategory,
  ProductStatus,
  ProductImageModel,
  ProductImageView,
  Marketplace,
} from '@/core/contracts';

export type Sku = {
  id: string;
  size: string;
  /** Internal TANAR article (e.g. TANAR-001). */
  article?: string;
  /** Russian size notation (e.g. 46) alongside the letter `size`. */
  ruSize?: string;
  priceOverride?: number;
  stockQty: number;
  reservedQty: number;
};

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
  models: ProductImageModel[];
  /** If true, also include front/side/back flat (white-background) shots in the gallery. */
  hasFlatShots?: boolean;
  skus: Sku[];
};

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  currency: 'KZT';
  description: string;
  specs: { label: string; value: string }[];
  /** Short tech badge from the garment label (NOT imported from db/schema — module boundary). */
  label?: { badge: string; sub: string };
  /** Garment care instructions (free text). */
  care?: string;
  gradient?: string;
  /** Always an array (may be empty for coming_soon products). */
  variants: ProductColor[];
  /** Links to the product on external marketplaces. */
  marketplaces?: Partial<Record<Marketplace, string>>;
};

export type GalleryShot = {
  view: ProductImageView;
  /** 'flat' = studio shot on white background (no model). */
  model: ProductImageModel | 'flat';
  src: string;
  alt: string;
};

export type { ProductCategory, ProductStatus, ProductImageModel, ProductImageView, Marketplace };
