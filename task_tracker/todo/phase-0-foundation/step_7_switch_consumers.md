# Шаг 7: Переключение потребителей на src/core/catalog (async)

> Зависит от: шаг 5 (репозиторий), шаг 6 (данные в БД)
> Статус: [ ] pending

## Задача

Переключить ВСЕ места, которые сейчас импортируют из `@/lib/product`, на `@/core/catalog`. Сделать вызовы async где нужно. Заменить проверки `product.comingSoon` на `product.status === 'coming_soon'`. Перевести страницы каталога на `force-dynamic` (решение из PLAN.md). Сохранить внешнее поведение — все e2e зелёные.

> **Предусловие (обязательно перед build/e2e):** `.env.local` существует с `DATABASE_URL`, postgres-dev поднят и наполнен. Dev-сервер (на котором гоняются e2e через `next dev --port 3001`) грузит `.env.local` сам; `next start` и рантайм-рендер тоже читают БД. Без этого `npm run test:e2e` и `npm run build`-затем-`start` упадут с cryptic connection error. Порядок: `npm run db:up && npm run db:seed` ДО `npm run test:e2e`.

### Полный список файлов и что в них поменять

#### 1. `src/app/catalog/page.tsx`

Сейчас:
```ts
import { CATEGORY_LABELS, CATEGORY_ORDER, getProductsByCategory, isValidCategory, type ProductCategory } from '@/lib/product';
// ...
const filtered = getProductsByCategory(active);
```

Заменить на:
```ts
import { CATEGORY_LABELS, CATEGORY_ORDER, getProductsByCategory, isValidCategory, type ProductCategory } from '@/core/catalog';

// SSG отключён: фильтр по категории читает БД при запросе.
export const dynamic = 'force-dynamic';
// ...
const filtered = await getProductsByCategory(active);
```

`CatalogPage` уже `async` — добавить `await`. Добавить `export const dynamic = 'force-dynamic';` на уровень модуля.

#### 2. `src/app/catalog/[slug]/page.tsx`

Сейчас:
```ts
import { getProductBySlug, getAllProductSlugs, getRelatedProducts, CATEGORY_LABELS } from '@/lib/product';

export async function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  // ...
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const related = getRelatedProducts(product);
  // ...
}
```

Заменить (force-dynamic, `generateStaticParams` УДАЛЯЕТСЯ — при динамике он не нужен, страница рендерится по запросу):
```ts
import { getProductBySlug, getRelatedProducts, CATEGORY_LABELS } from '@/core/catalog';

// SSG отключён: каталог — живые данные из БД (Вариант А). Рендер при запросе.
export const dynamic = 'force-dynamic';

// generateStaticParams УДАЛЁН (и getAllProductSlugs больше не импортируется здесь).

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  // ...
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product);
  // ...
}
```

> **Примечание:** `getAllProductSlugs` остаётся в публичном API `core/catalog` (реализован в шаге 5, пригодится для sitemap/МП-фида), но в `[slug]/page.tsx` больше не вызывается — убрать его из импорта этого файла, чтобы lint не ругался на unused.

#### 3. `src/components/home/FeaturedProducts.tsx`

Сейчас:
```ts
import { getAllProducts } from '@/lib/product';

export default function FeaturedProducts() {
  const featured = getAllProducts().slice(0, 4);
  // ...
}
```

Заменить — компонент становится async:
```ts
import { getAllProducts } from '@/core/catalog';

export default async function FeaturedProducts() {
  const all = await getAllProducts();
  const featured = all.slice(0, 4);
  // ...
}
```

#### 4. `src/components/ProductCard.tsx`

Сейчас:
```ts
import { CATEGORY_LABELS, formatPrice, getProductCardImage, getProductGradient, type Product } from '@/lib/product';
// ...
{product.comingSoon && <span>Скоро</span>}
{product.comingSoon ? 'Скоро в продаже' : formatPrice(product.price)}
const showImage = cardImage && !product.comingSoon;
```

Заменить:
```ts
import { CATEGORY_LABELS, formatPrice, getProductCardImage, getProductGradient, type Product } from '@/core/catalog';
// ...
const isComingSoon = product.status === 'coming_soon';
{isComingSoon && <span>Скоро</span>}
{isComingSoon ? 'Скоро в продаже' : formatPrice(product.price)}
const showImage = cardImage && !isComingSoon;
```

`defaultVariant = product.variants?.[0]` → `product.variants[0]` (тип теперь обязательный массив).

#### 5. `src/components/product/ProductDetail.tsx`

Сейчас (client component, получает `product` как prop — async не нужен):
```ts
import { formatPrice, getProductGalleryShots, getProductGradient, type Product } from '@/lib/product';
// ...
if (product.comingSoon) return <ProductDetailComingSoon product={product} />;
```

Заменить:
```ts
import { formatPrice, getProductGalleryShots, getProductGradient, type Product } from '@/core/catalog';
// ...
if (product.status === 'coming_soon') return <ProductDetailComingSoon product={product} />;
```

`const variants = product.variants ?? [];` → `const variants = product.variants;` (массив обязателен).

#### 6. `src/components/home/CategoriesGrid.tsx`

```ts
// было:
import { CATEGORY_LABELS, type ProductCategory } from '@/lib/product';
// стало:
import { CATEGORY_LABELS, type ProductCategory } from '@/core/catalog';
```

(Логику не трогаем.)

#### 7. `src/components/product/MarketplaceLinks.tsx`

```ts
// было:
import { MARKETPLACE_LABELS, type Marketplace } from '@/lib/product';
// стало:
import { MARKETPLACE_LABELS, type Marketplace } from '@/core/catalog';
```

#### 8. Проверить grep'ом: НЕТ других потребителей

```powershell
Select-String -Path src\**\*.ts, src\**\*.tsx -Pattern "@/lib/product"
# ожидаемый результат: 0 совпадений после правок выше
```

### Тип `Product`: `variants` стало обязательным

Везде где было `product.variants?.[0]`, `product.variants ?? []`, `(product.variants && product.variants.length > 1)` — теперь `product.variants[0]`, `product.variants`, `(product.variants.length > 1)`. Это правки в ProductCard и ProductDetail.

### Что НЕ меняется

- `src/lib/product.ts` ОСТАЁТСЯ нетронутым на этом шаге (удаление — шаг 8). Просто никто его больше не импортирует.
- `src/data/products.ts` ОСТАЁТСЯ нетронутым (удаление — шаг 8).
- ESLint-правило про `@/data/products` остаётся в силе.
- `src/lib/blog.ts`, BlogCard, страницы блога — НЕ ТРОГАЕМ.

## Тесты

- **ВСЕ существующие e2e должны быть зелёными.** Это ключевая проверка шага: данные те же, поведение то же.
- Особое внимание:
  - `home.spec.ts` — Featured products рендерятся
  - `catalog.spec.ts` — 6 чипов, фильтр работает
  - `product.spec.ts` — 404 для несуществующего slug
  - `responsive.spec.ts` / `layout.spec.ts` — общий вид
  - `smoke.spec.ts` — общий проход

Если какой-то e2e падает — это **регрессия поведения**, надо разобраться, а не править тест.

## Команды для верификации (PowerShell)

```powershell
# ОБЯЗАТЕЛЬНОЕ ПРЕДУСЛОВИЕ: .env.local существует с DATABASE_URL, postgres-dev запущен и наполнен.
# Dev-сервер (next dev --port 3001, на нём гоняются e2e) грузит .env.local сам.
# Без БД npm run test:e2e упадёт с cryptic connection error
# (playwright.config.ts поднимает только Next.js, не БД).
npm run db:up
npm run db:seed                                # на случай если БД пустая

npm run typecheck                              # без ошибок
npm run lint                                   # без ошибок
npm run build                                  # без ошибок (force-dynamic: билд НЕ читает БД; страницы рендерятся в рантайме)
npm run test:e2e                               # ВСЕ зелёные
# Проверка что нет недопереключенных импортов:
Select-String -Path src\**\*.ts, src\**\*.tsx -Pattern "@/lib/product"
# ожидаемый результат: 1 совпадение — src/data/products.ts:1 (import type { Product } from '@/lib/product').
# Сам src/lib/product.ts не импортирует @/lib/product (он его ОПРЕДЕЛЯЕТ).
# Обе строки удалятся в шаге 8 вместе с файлами.
```

## Критерии готовности

- [ ] Все 7 файлов выше переключены с `@/lib/product` на `@/core/catalog`
- [ ] `generateMetadata`, `ProductPage`, `FeaturedProducts` async + await везде где нужно
- [ ] `generateStaticParams` в `/catalog/[slug]/page.tsx` УДАЛЁН; `getAllProductSlugs` убран из импорта этого файла
- [ ] `export const dynamic = 'force-dynamic'` добавлен в `/catalog/page.tsx` и `/catalog/[slug]/page.tsx`
- [ ] Блог (`/blog/[slug]`) НЕ тронут — его `generateStaticParams` остаётся
- [ ] Все проверки `product.comingSoon` заменены на `product.status === 'coming_soon'`
- [ ] `product.variants` используется как обязательный массив (без `?.` и `?? []`)
- [ ] Grep `@/lib/product` в `src/` показывает только `src/data/products.ts:1` (импорт типа Product) — это удалится в шаге 8
- [ ] `npm run build` + `npm run test:e2e` — ВСЕ зелёные
- [ ] Внешний вид сайта не изменился (главная, /catalog, /catalog/[slug])
- [ ] Коммит: `refactor: switch consumers to @/core/catalog (async)`
