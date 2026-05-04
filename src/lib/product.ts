export type ProductCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'jackets': 'Куртки',
  'hoodies': 'Худи',
  't-shirts': 'Футболки',
  'pants': 'Штаны',
  'shorts': 'Шорты',
};

export const CATEGORY_ORDER: ProductCategory[] = ['jackets', 'hoodies', 't-shirts', 'pants', 'shorts'];

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

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  currency: 'KZT';
  description: string;
  specs: { label: string; value: string }[];
  gradient: string;
  comingSoon?: boolean;
  variants?: ProductColor[];
};

export type GalleryShot = {
  view: ProductImageView;
  /** 'flat' = studio shot on white background (no model). */
  model: ProductImageModel | 'flat';
  src: string;
  alt: string;
};

export function getProductCardImage(
  slug: string,
  color: string,
  model: ProductImageModel
): { md: string; lg: string } {
  const base = `/images/products/${slug}/${color}/front-${model}-card`;
  return { md: `${base}-md.webp`, lg: `${base}-lg.webp` };
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
        src: `/images/products/${product.slug}/${color}/${view}-${model}-full-lg.webp`,
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
        src: `/images/products/${product.slug}/${color}/${view}-flat-full-lg.webp`,
        alt: `${product.name} — ${variant.label}, студийное фото, ${viewLabel(view)}`,
      });
    }
  }

  return shots;
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₸`;
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
