import type { ProductCategory, Marketplace } from '@/core/contracts';

/** Single source of truth for product categories (id + display label). */
export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'jackets', label: 'Куртки' },
  { id: 'pants', label: 'Брюки' },
  { id: 'shorts', label: 'Шорты' },
  { id: 'tshirts', label: 'Футболки' },
  { id: 'polo', label: 'Поло' },
];

export const CATEGORY_ORDER: ProductCategory[] = CATEGORIES.map((c) => c.id);

export const CATEGORY_LABELS: Record<ProductCategory, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<ProductCategory, string>;

export function isValidCategory(value: string | undefined): value is ProductCategory {
  return CATEGORY_ORDER.includes(value as ProductCategory);
}

export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  ozon: 'Ozon',
  kaspi: 'Kaspi',
};
