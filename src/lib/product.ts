export type ProductCategory = 'jackets' | 'backpacks' | 'accessories' | 't-shirts';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'jackets': 'Куртки',
  'backpacks': 'Рюкзаки',
  'accessories': 'Аксессуары',
  't-shirts': 'Футболки',
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
};

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
  return value === 'jackets' || value === 'backpacks' || value === 'accessories' || value === 't-shirts';
}
