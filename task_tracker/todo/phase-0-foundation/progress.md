# Progress Log — Phase 0 Foundation

## Контекст для агента

### Где что лежит СЕЙЧАС (до Фазы 0)

**Данные и слой доступа:**
- `src/data/products.ts` — массив `Product[]`. Состав «живой» (заказчица меняет): часть товаров имеет `variants`, часть с `comingSoon: true` без variants. Все конкретные количества в плане считаются динамически из массива, без хардкода — это снимает необходимость переписывать план при каждом изменении каталога.
- `src/lib/product.ts` — типы (`Product`, `ProductColor`, `ProductCategory`, `Marketplace`, `GalleryShot`, `ProductImageModel`, `ProductImageView`), константы (`CATEGORIES`, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `MARKETPLACE_LABELS`), функции (`getAllProducts`, `getProductBySlug`, `getAllProductSlugs`, `getProductsByCategory`, `getRelatedProducts`, `getProductCardImage`, `getProductGalleryShots`, `getProductGradient`, `formatPrice`, `isValidCategory`), приватный `productImagePath` + `PRODUCT_IMAGE_BASE`.
- `src/lib/gradients.ts` — `OUTDOOR_GRADIENTS`, `gradientFromString` (используется в `getProductGradient` и `Placeholder`).

**Все потребители `@/lib/product` (8 файлов):**
- `src/app/catalog/page.tsx` — `CATEGORY_LABELS, CATEGORY_ORDER, getProductsByCategory, isValidCategory, ProductCategory`
- `src/app/catalog/[slug]/page.tsx` — `getProductBySlug, getAllProductSlugs, getRelatedProducts, CATEGORY_LABELS`. Имеет `generateStaticParams` (sync) и `generateMetadata` (async). `ProductPage` уже async.
- `src/components/ProductCard.tsx` — `CATEGORY_LABELS, formatPrice, getProductCardImage, getProductGradient, Product`
- `src/components/home/FeaturedProducts.tsx` — `getAllProducts` (server component, sync вызов)
- `src/components/home/CategoriesGrid.tsx` — `CATEGORY_LABELS, ProductCategory` (только типы/константы, async не нужен)
- `src/components/product/ProductDetail.tsx` — `formatPrice, getProductGalleryShots, getProductGradient, Product` (CLIENT component, получает product как prop — переключение НЕ требует async)
- `src/components/product/MarketplaceLinks.tsx` — `MARKETPLACE_LABELS, Marketplace` (только типы/константы)
- `src/data/products.ts` сам — `import type { Product } from '@/lib/product'`

**Витрина уже частично async:**
- `CatalogPage` — `async`.
- `ProductPage` — `async`, `generateMetadata` — `async`, `generateStaticParams` — sync (но Next.js 15 поддерживает async).

**FeaturedProducts и ProductCard — server components без 'use client'.**

### КРИТИЧНЫЕ факты (не сломать)

- **Поведение сайта не меняется.** Все 8 e2e-файлов (home, catalog, blog-list, blog-post, product, layout, responsive, smoke) должны быть зелёными без изменений в их коде.
- **Картинки уже в `public/images/products/{slug}/{color}/...`** — генерация через `scripts/process-images.mjs` НЕ трогается. `MediaAsset.url` хранит готовые публичные URL, формируемые тем же шаблоном что в `productImagePath`. Сам шаблон переезжает в `core/catalog`.
- **Блог** (`src/lib/blog.ts`, `content/blog/*.mdx`) — НЕ трогаем. `LatestPosts`, `BlogCard`, `/blog`, `/blog/[slug]` остаются как есть.
- **Pre-arch-refactor уже сделан** (в done/, проверено). Текущее состояние `src/lib/product.ts` — после рефакторинга: есть `CATEGORIES`, `getProductGradient`, `getAllProducts`, `PRODUCT_IMAGE_BASE`. ESLint правило `no-restricted-imports` запрещает `@/data/products` везде кроме `src/lib/product.ts` — это правило ЗАМЕНЯЕТСЯ в шаге 8 на новые правила границ модулей.
- **`product.gradient` в данных** — после миграции в БД хранится как TEXT (опционально). Колонка `gradient` в таблице products.

### Окружение

- Windows / PowerShell. ВСЕ команды верификации — через PowerShell или npm-скрипты (кроссплатформенные). Никаких bash `/dev/null`.
- Next.js 15 App Router, Turbopack (`next dev --turbopack`, `next build --turbopack`).
- Tailwind v3 (нет `tailwind.config.ts`).
- TypeScript strict.
- Node `>=20 <21` (из package.json `engines`).
- Playwright dev-server: `npx next dev --port 3001`, `reuseExistingServer: true`. `npm run dev` = порт 3000.
- Docker Desktop требуется для Postgres.

### Что НЕ делать в Фазе 0

- НЕ добавлять Drizzle Studio (это не критично).
- НЕ писать unit-тесты (отдельный план в backlog/unit-tests-for-core.md).
- НЕ заводить admin-маршруты `(admin)/` — это Фаза 1.
- НЕ создавать `src/marketplace/{kaspi,ozon,wildberries}` — только `contract/`, остальные — Фаза 5.
- НЕ менять блог.
- НЕ трогать sharp-пайплайн и `assets/`.
- НЕ менять public сигнатуры функций каталога кроме `sync → async` (никаких новых параметров, никаких новых return-полей).

### Команды для будущих скриптов package.json

После плана в package.json должны быть:
```json
"db:up": "docker compose up -d",
"db:down": "docker compose down",
"db:migrate": "drizzle-kit migrate",
"db:generate": "drizzle-kit generate",
"db:seed": "tsx src/core/db/seed.ts"
```

## Learnings
(заполняется в процессе работы)
---
