# Step 2: Расширение data model для вариантов цвета

> Статус: pending

## Цель

Обновить тип `Product` в `src/lib/product.ts`, чтобы поддерживал варианты цвета и флаг "скоро в продаже". Добавить хелперы для построения путей к фоткам. Удалить старые категории, добавить новые.

## Действия

### 1. Обновить `src/lib/product.ts`

```ts
export type ProductCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'jackets': 'Куртки',
  'hoodies': 'Худи',
  't-shirts': 'Футболки',
  'pants': 'Штаны',
  'shorts': 'Шорты',
};

export const CATEGORY_ORDER: ProductCategory[] = ['jackets', 'hoodies', 't-shirts', 'pants', 'shorts'];

export type ProductColor = {
  /** slug-safe id, например "darkblue", "lightpink" */
  id: string;
  /** Подпись для UI: "Тёмно-синий" */
  label: string;
  /** Hex для свотча */
  hex: string;
  /** Какие "типажи" сняты в этом цвете */
  models: ('man' | 'girl')[];
};

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  currency: 'KZT';
  description: string;
  specs: { label: string; value: string }[];
  /** Градиент-фоллбек для карточки если фото не загрузится / для заглушек "Скоро" */
  gradient: string;
  /** Если true — товар не продаётся, рендерим градиент + бейдж */
  comingSoon?: boolean;
  /** Список цветовых вариантов. Если пусто — товар без вариантов (заглушка). */
  variants?: ProductColor[];
};

export type ProductImageView = 'front' | 'side' | 'back';
export type ProductImageModel = 'man' | 'girl';

export type GalleryShot = {
  view: ProductImageView;
  model: ProductImageModel;
  /** Полная версия (1600w, оригинальная пропорция) — для большого фото и миниатюр */
  src: string;
  alt: string;
};

/**
 * Превью для карточки в каталоге (3:4 кроп).
 * Возвращает md (600w) и lg (1200w) для srcSet.
 */
export function getProductCardImage(
  slug: string,
  color: string,
  model: ProductImageModel
): { md: string; lg: string } {
  const base = `/images/products/${slug}/${color}/front-${model}-card`;
  return { md: `${base}-md.webp`, lg: `${base}-lg.webp` };
}

/**
 * Все кадры для галереи на странице товара (front/side/back × все доступные типажи).
 * Возвращает полные версии (1600w, оригинальная пропорция) — миниатюры используют те же src.
 */
export function getProductGalleryShots(product: Product, color: string): GalleryShot[] {
  const variant = product.variants?.find(v => v.id === color);
  if (!variant) return [];
  const views: ProductImageView[] = ['front', 'side', 'back'];
  const shots: GalleryShot[] = [];
  for (const model of variant.models) {
    for (const view of views) {
      shots.push({
        view,
        model,
        src: `/images/products/${product.slug}/${color}/${view}-${model}-full-lg.webp`,
        alt: `${product.name} — ${variant.label}, ${view === 'front' ? 'спереди' : view === 'side' ? 'сбоку' : 'сзади'}`,
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
```

### 2. Что НЕ менять
- Не трогать `formatPrice`, остальные функции по сигнатуре
- Не убирать `gradient` из `Product` — он нужен для заглушек и как фоллбек

## Критерии готовности

- [ ] `src/lib/product.ts` обновлён согласно спецификации выше
- [ ] `npm run typecheck` — exit 0 (могут временно ругаться импорты `products` — это ок, починится в step_4)
- [ ] Если автотесты не падают — `npm run lint` тоже зелёный

## Verification

```bash
npm run typecheck 2>&1 | head -20
grep -n "ProductCategory" src/lib/product.ts
```
