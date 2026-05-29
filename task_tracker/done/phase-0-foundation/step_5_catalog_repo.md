# Шаг 5: Репозиторий src/core/catalog (async, читает из БД)

> Зависит от: шаг 3 (схема), шаг 4 (скелет модулей)
> Статус: [ ] pending

## Задача

Реализовать модуль `src/core/catalog` как **async-репозиторий с теми же сигнатурами**, что в текущем `src/lib/product.ts` (плюс async). На этом шаге БД ещё пустая — функции возвращают пустые массивы / undefined. Наполнение — в шаге 6, переключение потребителей — в шаге 7.

### Структура модуля

```
src/core/catalog/
  index.ts                 ← публичный API
  types.ts                 ← бизнес-типы: Product, ProductColor, Sku, GalleryShot, MarketplaceLinks
  categories.ts            ← CATEGORIES, CATEGORY_LABELS, CATEGORY_ORDER, isValidCategory, MARKETPLACE_LABELS
  repository.ts            ← async-функции чтения из БД (через core/db)
  images.ts                ← getProductCardImage, getProductGalleryShots, PRODUCT_IMAGE_BASE (приватный)
  gradient.ts              ← getProductGradient
  format.ts                ← formatPrice
```

### `types.ts`

Переносим из `src/lib/product.ts`:
- `Product` — добавить поле `status: ProductStatus` (вместо `comingSoon?: boolean`). `gradient` остаётся опционально. **Поле `comingSoon` УБИРАЕМ полностью** (status его покрывает; шаг 7 переведёт все проверки).
- `ProductColor` — без изменений (`id, label, hex, models, hasFlatShots?`).
- `Sku` — НОВЫЙ тип: `{ id: string; size: string; priceOverride?: number; stockQty: number; reservedQty: number }`. Variants в Product теперь содержат `skus: Sku[]`.
- `GalleryShot` — без изменений (`view, model, src, alt`).

Импорт примитивных union из `@/core/contracts`: `ProductCategory, ProductStatus, ProductImageModel, ProductImageView, Marketplace`.

```ts
import type { ProductCategory, ProductStatus, ProductImageModel, ProductImageView, Marketplace } from '@/core/contracts';

export type Sku = {
  id: string;
  size: string;
  priceOverride?: number;
  stockQty: number;
  reservedQty: number;
};

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
  models: ProductImageModel[];
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
  gradient?: string;
  variants: ProductColor[];   // теперь обязательно массив (может быть пустым для coming_soon)
  marketplaces?: Partial<Record<Marketplace, string>>;
};

export type { ProductCategory, ProductStatus, ProductImageModel, ProductImageView, Marketplace };
```

### `categories.ts`

Переносим из `lib/product.ts` без логических изменений:
```ts
import type { ProductCategory, Marketplace } from '@/core/contracts';

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

export function isValidCategory(value: string | undefined): value is ProductCategory {
  return CATEGORY_ORDER.includes(value as ProductCategory);
}

export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  ozon: 'Ozon',
  kaspi: 'Kaspi',
};
```

### `images.ts`

Переносим `getProductCardImage`, `getProductGalleryShots`, приватные `PRODUCT_IMAGE_BASE` и `productImagePath` без изменений сигнатур.

Импорт `Product, ProductImageModel` — из `./types`.

> Поясн.: в Фазе 0 URL'ы продолжают формироваться по файловой конвенции. `MediaAsset.url` в БД хранит те же URL — это просто кэш. Реальный переход на чтение URL из MediaAsset вместо генерации — в Фазе 1 (когда админка начнёт грузить новые файлы). На Фазу 0 поведение бит-в-бит совпадает.

### `gradient.ts`

```ts
import { gradientFromString } from '@/lib/gradients';
import type { Product } from './types';

export function getProductGradient(product: Product): string {
  return product.gradient ?? gradientFromString(product.slug);
}
```

(Импорт `@/lib/gradients` — пока легальный, gradients.ts не модуль `core/`. В Фазе 1+ его можно вынести в `core/ui` или оставить — отдельное решение.)

### `format.ts`

```ts
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₸`;
}
```

### `repository.ts` — async-функции

Сигнатуры (все async, возвращают то же что раньше плюс `Promise<...>`):

```ts
import { eq, and, ne, asc } from 'drizzle-orm';
import { db, schema } from '@/core/db';  // публичный API модуля db (создан в step 4)
import type { ProductCategory } from '@/core/contracts';
import type { Product } from './types';

export async function getAllProducts(): Promise<Product[]>
export async function getProductBySlug(slug: string): Promise<Product | undefined>
export async function getAllProductSlugs(): Promise<string[]>
export async function getProductsByCategory(category: ProductCategory | null): Promise<Product[]>
export async function getRelatedProducts(current: Product, limit?: number): Promise<Product[]>
```

**Реализация:** каждая функция читает товары из `products` таблицы, LEFT JOIN'ит `product_variants` и `skus`, собирает `Product` объект формы из `types.ts`. Маркетплейс-ссылки (jsonb) парсятся из `products.marketplaces`. `specs` (jsonb) — то же.

Конкретно для `getProductsByCategory(null)` → все товары (как сейчас).
Для `getRelatedProducts(current, limit = 3)` → товары той же категории, исключая current.slug, лимит limit.

**Способ реализации — фиксирован (без альтернатив):**

Используем **обычные `db.select().leftJoin(...)` запросы с группировкой в TypeScript**. НЕ используем drizzle relational-queries (`db.query.products.findMany({ with: ... })`) — они требуют отдельного объявления `relations()` в schema.ts, которого в step 3 нет, и добавлять их сейчас — лишняя зависимость.

Шаблон одного запроса:
```ts
const rows = await db
  .select()
  .from(schema.products)
  .leftJoin(schema.productVariants, eq(schema.productVariants.productId, schema.products.id))
  .leftJoin(schema.skus, eq(schema.skus.variantId, schema.productVariants.id))
  .where(/* условие */);
// rows: плоский массив, каждая строка = (product, variant?, sku?)
// группируем в Map<productId, Product> вручную: для каждой row вставляем variant в product.variants, sku в variant.skus.
// Дедупликация variant по id (LEFT JOIN со skus даёт N строк на variant).
```

**Маппинг колонок БД → полей типа Product** (важно — Drizzle возвращает camelCase):
| колонка БД | поле в строке (Drizzle) | поле в Product |
|---|---|---|
| `products.price_base` | `priceBase` | `price` |
| `products.created_at` | `createdAt` | (не в типе, игнорируется) |
| `product_variants.color_id` | `colorId` | `id` |
| `product_variants.color_label` | `colorLabel` | `label` |
| `product_variants.has_flat_shots` | `hasFlatShots` | `hasFlatShots` |
| `skus.stock_qty` | `stockQty` | `stockQty` |
| `skus.reserved_qty` | `reservedQty` | `reservedQty` |
| `skus.price_override` | `priceOverride` | `priceOverride` |

**Coming_soon товары без variants:** LEFT JOIN вернёт строки с `variant = null`. В группировке для таких — `product.variants = []` (явно пустой массив, НЕ undefined — тип `variants` обязательный).

**Один query вместо N+1:** для 10 товаров оптимизация не критична, но архитектурно правильно сразу. `getAllProducts`, `getProductsByCategory`, `getRelatedProducts` — все через один JOIN-запрос. `getProductBySlug` — один JOIN-запрос с `WHERE products.slug = ?`. `getAllProductSlugs` — отдельный лёгкий `SELECT slug FROM products`.

### `index.ts` (публичный API)

```ts
export * from './types';
export * from './categories';
export * from './images';
export * from './gradient';
export * from './format';
export * from './repository';
```

### Внутренняя проверка после реализации

БД пустая → `getAllProducts()` возвращает `[]`. Это не тестируем e2e (он сломается, потому что витрина пуста), это **намеренное промежуточное состояние** — наполняется в шаге 6.

Поэтому в этом шаге **нельзя ещё переключать потребителей** на новый модуль. `src/lib/product.ts` остаётся в строю, витрина продолжает читать из него синхронно. `src/core/catalog` существует параллельно.

## Тесты

- E2e не затрагиваются на этом шаге (потребители ещё не переключены).
- Smoke вручную: dev-консолью node вызвать функцию и проверить что возвращает пустой массив без ошибок.

## Команды для верификации (PowerShell)

```powershell
npm run typecheck                              # без ошибок
npm run lint                                   # без ошибок (границы соблюдены: catalog читает только из core/db и core/contracts)
npm run build                                  # без ошибок
```

Smoke-проверка коннекта (отдельный скрипт, не inline `tsx -e` — он не резолвит alias `@/`):

Создать **временный** `src/core/catalog/_smoke.ts`:
```ts
import { getAllProducts } from '.';

(async () => {
  const r = await getAllProducts();
  console.log('rows:', r.length);
  process.exit(0);
})();
```

Запустить и удалить:
```powershell
npx tsx -r tsconfig-paths/register src/core/catalog/_smoke.ts   # ожидается: rows: 0 (БД пустая)
Remove-Item src/core/catalog/_smoke.ts
```

(`tsconfig-paths/register` нужен чтобы tsx понимал alias `@/core/*`. Пакет `tsconfig-paths` уже есть в devDependencies проекта — проверено.)

## Критерии готовности

- [ ] Файлы `src/core/catalog/{index,types,categories,images,gradient,format,repository}.ts` созданы
- [ ] Все 5 async-функций реализованы и читают из БД через `@/core/db`
- [ ] `index.ts` реэкспортирует всё публичное
- [ ] Тип `Product` имеет `status: ProductStatus` и `variants: ProductColor[]` (НЕ опционально), без поля `comingSoon`
- [ ] Smoke-команда возвращает `rows: 0` (БД пустая, но коннект работает)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Существующая витрина продолжает работать (потребители НЕ переключены — это шаг 7)
- [ ] Коммит: `feat(core/catalog): async repository reading from db`
