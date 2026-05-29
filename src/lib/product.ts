import { gradientFromString } from '@/lib/gradients';

export type ProductCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts';

/** Single source of truth for product categories (id + display label). */
export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'jackets', label: 'Куртки' },
  { id: 'hoodies', label: 'Худи' },
  { id: 't-shirts', label: 'Футболки' },
  { id: 'pants', label: 'Штаны' },
  { id: 'shorts', label: 'Шорты' },
];

export const CATEGORY_ORDER: ProductCategory[] = CATEGORIES.map(c => c.id);
export const CATEGORY_LABELS: Record<ProductCategory, string> =
  Object.fromEntries(CATEGORIES.map(c => [c.id, c.label])) as Record<ProductCategory, string>;

export type ProductImageModel = 'man' | 'girl';
export type ProductImageView = 'front' | 'side' | 'back';

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
  models: ProductImageModel[];
  /** If true, also include front/side/back flat (white-background) shots in the gallery. */
  hasFlatShots?: boolean;
};

/** External marketplace where the product can be purchased. */
export type Marketplace = 'ozon' | 'kaspi';

export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  ozon: 'Ozon',
  kaspi: 'Kaspi',
};

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  currency: 'KZT';
  description: string;
  specs: { label: string; value: string }[];
  gradient?: string;
  comingSoon?: boolean;
  variants?: ProductColor[];
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

const PRODUCT_IMAGE_BASE = '/images/products';

/** Builds the path to a single product image variant file. */
function productImagePath(slug: string, color: string, file: string): string {
  return `${PRODUCT_IMAGE_BASE}/${slug}/${color}/${file}`;
}

export function getProductCardImage(
  slug: string,
  color: string,
  model: ProductImageModel
): { md: string; lg: string } {
  return {
    md: productImagePath(slug, color, `front-${model}-card-md.webp`),
    lg: productImagePath(slug, color, `front-${model}-card-lg.webp`),
  };
}

export function getProductGalleryShots(product: Product, color: string): GalleryShot[] {
  const variant = product.variants?.find(v => v.id === color);
  if (!variant) return [];
  const views: ProductImageView[] = ['front', 'side', 'back'];
  const viewLabel = (v: ProductImageView) =>
    v === 'front' ? 'спереди' : v === 'side' ? 'сбоку' : 'сзади';
  const shots: GalleryShot[] = [];

  // Lifestyle (with model, in nature) shots first
  for (const model of variant.models) {
    for (const view of views) {
      shots.push({
        view,
        model,
        src: productImagePath(product.slug, color, `${view}-${model}-full-lg.webp`),
        alt: `${product.name} — ${variant.label}, ${viewLabel(view)}`,
      });
    }
  }

  // Flat (studio, white background) shots after lifestyle
  if (variant.hasFlatShots) {
    for (const view of views) {
      shots.push({
        view,
        model: 'flat',
        src: productImagePath(product.slug, color, `${view}-flat-full-lg.webp`),
        alt: `${product.name} — ${variant.label}, студийное фото, ${viewLabel(view)}`,
      });
    }
  }

  return shots;
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₸`;
}

/** Presentation gradient for a product: explicit override or derived from slug. */
export function getProductGradient(product: Product): string {
  return product.gradient ?? gradientFromString(product.slug);
}

import { products } from '@/data/products';

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}

export function getAllProductSlugs(): string[] {
  return products.map(p => p.slug);
}

export function getRelatedProducts(current: Product, limit = 3): Product[] {
  return products
    .filter(p => p.category === current.category && p.slug !== current.slug)
    .slice(0, limit);
}

export function getProductsByCategory(category: ProductCategory | null): Product[] {
  if (!category) return products;
  return products.filter(p => p.category === category);
}

export function isValidCategory(value: string | undefined): value is ProductCategory {
  return CATEGORY_ORDER.includes(value as ProductCategory);
}
