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
