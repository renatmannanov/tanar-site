# Шаг 5: Catalog list

> Зависит от: шаги 1–4 (типы и data-stub созданы в step_4)
> Статус: [ ] pending

## Задача

Страница `/catalog` — листинг всех продуктов с фильтром-чипами по категориям. Создать переиспользуемый `ProductCard`.

### Порядок действий

1. **`src/lib/product.ts`** уже существует (создан в step_4 с типами `ProductCategory`, `Product`, `CATEGORY_LABELS`, `formatPrice`). **НЕ перезаписывать файл целиком** — только дополнить новыми функциями в конец. Используй Edit/append, не Write с полным содержимым. Если случайно перезапишешь — верификация упадёт на `grep -q "CATEGORY_LABELS"` или `grep -q "export type Product"`.

   Добавить в конец файла:

   ```ts
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
   ```

2. **Компонент `src/components/ProductCard.tsx`**:
   - Props: `product: Product`
   - Link на `/catalog/${product.slug}`
   - `<Placeholder aspect="portrait" label={product.name} gradient={product.gradient}>`
   - Под картинкой: категория (`CATEGORY_LABELS[product.category]`, маленький uppercase opacity-60), название, цена через `formatPrice(product.price)`
   - Hover: `transition-transform duration-300 hover:-translate-y-1`
   - `data-testid="product-card"`, `data-category={product.category}`
   - Server component

3. **Страница `src/app/catalog/page.tsx`** — server component, Next 15 async searchParams:

   ```tsx
   import { products } from '@/data/products';
   import { CATEGORY_LABELS, isValidCategory, type ProductCategory } from '@/lib/product';
   import ProductCard from '@/components/ProductCard';
   import Link from 'next/link';

   export const metadata = {
     title: 'Каталог — Tanar',
     description: 'Куртки, рюкзаки, аксессуары и футболки Tanar.',
   };

   type Props = { searchParams: Promise<{ category?: string }> };

   export default async function CatalogPage({ searchParams }: Props) {
     const params = await searchParams;           // ← обязательный await в Next 15
     const raw = params.category;
     const active: ProductCategory | null = isValidCategory(raw) ? raw : null;
     const filtered = active ? products.filter(p => p.category === active) : products;

     // ... рендер hero-блока, chip-кнопок, grid продуктов
   }
   ```

   **Обязательно** использовать `await searchParams` — в Next 15 без await это Promise, не объект.

4. **Визуальная структура страницы**:
   - Hero-блок сверху: заголовок "Каталог", подзаголовок "Всё для встречи рассвета"
   - Ряд chip-кнопок:
     - "Все" → `<Link href="/catalog">` (активна когда `active === null`)
     - "Куртки" → `<Link href="/catalog?category=jackets">`
     - "Рюкзаки" → `<Link href="/catalog?category=backpacks">`
     - "Аксессуары" → `<Link href="/catalog?category=accessories">`
     - "Футболки" → `<Link href="/catalog?category=t-shirts">`
   - Активный chip: `bg-stone-900 text-stone-50`, неактивный: `bg-stone-100 text-stone-700 hover:bg-stone-200`
   - Grid продуктов: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, gap-6
   - Если `filtered.length === 0` — `<p>Скоро здесь появятся товары</p>` (а не 404!)
   - Корневой `<section data-testid="catalog-grid">`

5. **Обновить `FeaturedProducts` из step_4** — заменить инлайн-рендер на `<ProductCard product={p} />`. Фоллбек "Скоро здесь" для пустого массива оставить.

6. **Playwright spec `e2e/catalog.spec.ts`**:
   - Тест 1: `/catalog` → заголовок "Каталог" виден, ответ 200
   - Тест 2: chip "Все" и 4 категории присутствуют (проверить по тексту кнопок)
   - Тест 3: клик по chip "Куртки" → URL содержит `category=jackets`, активная chip имеет класс `bg-stone-900`
   - Тест 4: нет page errors и console errors на `/catalog` (даже если products пустой). Использовать:
     ```ts
     const errors: string[] = [];
     page.on('pageerror', e => errors.push(e.message));
     page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
     await page.goto('/catalog');
     expect(errors).toEqual([]);
     ```

7. Коммит:
   ```bash
   git add -A
   git commit -m "feat(catalog): ProductCard, /catalog page with category filter"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/catalog.spec.ts
```

Файлы:

```bash
test -f src/components/ProductCard.tsx
test -f "src/app/catalog/page.tsx"
test -f e2e/catalog.spec.ts

# product.ts дополнен функциями (не перезаписан с нуля)
grep -q "getProductBySlug" src/lib/product.ts
grep -q "getAllProductSlugs" src/lib/product.ts
grep -q "getRelatedProducts" src/lib/product.ts
grep -q "isValidCategory" src/lib/product.ts
# Оригинальные типы из step_4 остались
grep -q "CATEGORY_LABELS" src/lib/product.ts
grep -q "export type Product" src/lib/product.ts

# await в catalog page (критично для Next 15)
grep -q "await searchParams" src/app/catalog/page.tsx

# FeaturedProducts использует ProductCard (не инлайн)
grep -q "ProductCard" src/components/home/FeaturedProducts.tsx
```

## Критерии готовности

- [ ] `/catalog` открывается и отдаёт 200
- [ ] Фильтр работает через URL `?category=...`
- [ ] 4 chip-кнопки + "Все" присутствуют
- [ ] Пустой список показывает "Скоро здесь появятся товары"
- [ ] `await searchParams` явно используется (проверяется grep-ом)
- [ ] `ProductCard` переиспользован в `FeaturedProducts` (проверяется grep-ом)
- [ ] Playwright catalog.spec.ts проходит
- [ ] Нет page/console errors на `/catalog`
- [ ] Build, typecheck, lint зелёные
- [ ] Коммит
