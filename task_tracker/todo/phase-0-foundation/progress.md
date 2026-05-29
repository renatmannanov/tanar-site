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

### Шаги 1-3 (выполнено, 2026-05-29)

- **ПОРТЫ ИЗМЕНЕНЫ: dev=5442, test=5443** (НЕ 5432/5433 как в исходном плане). Причина: на хосте уже запущен **нативный PostgreSQL на 0.0.0.0:5432**, он перехватывал внешние TCP-соединения вместо Docker-контейнера → `28P01 password authentication failed`. Внутри контейнера 5432 (`docker exec`) работало (peer/trust по сокету), снаружи — нет. Решение: host-порты сдвинуты на 5442/5443 (внутри контейнера остаётся 5432). Изменены: docker-compose.yml, .env.example, .env.local. **Все будущие команды и URL используют 5442/5443.** Имена контейнеров: `tanar-site-postgres-dev-1`, `tanar-site-postgres-test-1`.
- **`drizzle-kit migrate` CLI РАБОТАЕТ** после исправления порта. Раньше «висел» на `applying migrations...` — это был молчаливый ретрай auth-фейла на чужом постгресе, НЕ баг drizzle. Штатный `db:migrate` (CLI) используется как в плане.
- **dotenv НЕ перезатирает существующие env.** Инлайн `DATABASE_URL=... npx drizzle-kit migrate` имеет приоритет над `.env.local` (dotenv добавляет только отсутствующие). Так применяли миграцию к test-БД.
- **Node v24.11.1** на машине (package.json engines просит `>=20 <21`) → npm выдаёт EBADENGINE warning, но всё работает. tsx с cjs-выводом НЕ поддерживает top-level await — оборачивать скрипты в `async function main(){...}; main()` (важно для seed.ts/reset.ts в шаге 6!).
- **pgcrypto:** строка `CREATE EXTENSION IF NOT EXISTS pgcrypto;` + `--> statement-breakpoint` дописана в начало `migrations/0000_same_typhoid_mary.sql` (для `gen_random_uuid()` через `.defaultRandom()`).
- **client.ts уже экспортирует `queryClient`** (задел для шага 6 — закрытие пула через `.end()`), привязан к схеме: `drizzle(queryClient, { schema })`.
- **jsonb типизированы через `.$type<>()`** в schema.ts с INLINE-типами (`Marketplace`, `ProductImageModel`, `ProductSpec`) — потому что `@/core/contracts` ещё нет. **Шаг 4 ДОЛЖЕН** переключить их на импорт из `@/core/contracts`.
- **tailwind.config.ts РЕАЛЬНО СУЩЕСТВУЕТ** (v3-конфиг с typography). Утверждение в progress.md выше («нет tailwind.config.ts», строка ~40) и в CLAUDE.md — устаревшее, исправляется в шаге 9.
- **Обе БД (dev+test) мигрированы:** 7 таблиц + 1 запись в `drizzle.__drizzle_migrations` в каждой.

### Шаг 5 (выполнено, 2026-05-29)

- **КРИТИЧНО для шага 6 — загрузка env в tsx-скриптах:** `client.ts` читает `process.env.DATABASE_URL` **в момент импорта** (top-level). `dotenv.config()` ВНУТРИ скрипта не помогает — статические import-цепочки исполняются ДО тела (ES-семантика). **ФИНАЛЬНОЕ РЕШЕНИЕ: `tsx --env-file=.env.local -r tsconfig-paths/register <file>`** — tsx (4.21) грузит env нативно до импортов, кросс-платформенно, без новых пакетов. ❌ НЕ работает: `-r <preload>.ts` (любой .ts через -r) ломает tsx-loader на Node 24 (`resolveSync not implemented`). ⚠️ Работает, но хуже: `-r dotenv/config` + `DOTENV_CONFIG_PATH=.env.local` (cjs preload ок, но env-переменную на Windows в npm-скрипте без cross-env не задать). Используем `--env-file`.
- **Репозиторий читает через один JOIN-запрос** (`baseSelect()` = products LEFT JOIN variants LEFT JOIN skus), группировка строк в `Product[]` вручную (`groupRows`), порядок продуктов сохраняется. coming_soon без вариантов → `variants: []`.
- **`productImagePath` СДЕЛАН ПУБЛИЧНЫМ** (экспорт из images.ts → виден через `@/core/catalog`). В старом lib/product.ts он был приватным. Причина: шаг 6 (seed) импортирует его для генерации media_assets URL. Это сознательное отклонение.
- **Drizzle типы строк:** `typeof schema.products.$inferSelect` и т.д. Joined-строка имеет ключи по ИМЕНИ ТАБЛИЦЫ: `products`, `product_variants`, `skus` (не camelCase var-имена). Используется в `JoinedRow`.
- БД пустая → `getAllProducts()` вернул `rows: 0`. Потребители НЕ переключены (это шаг 7), витрина читает старый lib/product, build всё ещё SSG для каталога (станет dynamic в шаге 7).

### Шаг 6 (выполнено, 2026-05-29)

- **Seed работает. Фактические числа из текущего каталога:** products=10 (published=5, coming_soon=5), variants=13, skus=13 (по 1 OS на variant), media_assets=51. **Это НЕ хардкод** — seed вычисляет ожидаемые числа из массива `@/data/products` и сверяет с БД; при изменении каталога пересчитается сам. (Цифры тут — для справки, не для проверки.)
- **`db.$count` работает** в drizzle 0.45 — fallback на `count(*)` не понадобился.
- **Идемпотентность через TRUNCATE ... CASCADE** в начале seed.ts. Повторный запуск → те же числа.
- **Guard проверен:** `DATABASE_URL` без `tanar_dev|tanar_test` → throw до любых операций. Тест: инлайн prod-URL без `--env-file` → падает с понятной ошибкой.
- **reset.ts** отдельным скриптом, тот же guard, `reset OK: all tables truncated`.
- **env через `--env-file=.env.local`** (решение из шага 5) — оба скрипта запускаются без `DATABASE_URL is not set`, без dotenv в коде.
- **Repository + seed проверены вместе:** `getAllProducts()` вернул 10, coming_soon с пустым `variants: []`, varианты с 1 SKU 'OS'. `getProductBySlug` ок.
- seed.ts импортирует `productImagePath` из `@/core/catalog` (публичный, сделан в шаге 5) для генерации media URL по той же конвенции.

### Шаг 7 (выполнено, 2026-05-29)

- **ВСЕ 40 e2e зелёные.** Поведение сайта не изменилось. БД up+seeded — предусловие выполнено.
- **force-dynamic:** `/catalog`, `/catalog/[slug]` И `/` (главная) — все `ƒ (Dynamic)`. `generateStaticParams` в `[slug]` удалён. Блог `/blog/[slug]` остался `● (SSG)` — не тронут.
- **ОТКЛОНЕНИЕ 1 — главная (`/`) тоже force-dynamic.** План упоминал только каталог, но `FeaturedProducts` (на главной) стал async и читает БД → главную тоже надо было пометить, иначе билд лез бы в Postgres. Добавлено `export const dynamic = 'force-dynamic'` в `src/app/page.tsx`.
- **ОТКЛОНЕНИЕ 2 (важное, влияет на Фазу 1) — РАЗДЕЛЕНИЕ client/server API каталога.** Client-компонент `ProductDetail` ('use client') импортил чистые функции из `@/core/catalog`, но barrel через `export *` тянул `repository → @/core/db → postgres` в клиентский бандл → build падал `Can't resolve 'tls'/'net'/'crypto'`. **Решение (Вариант 1):** создан второй публичный вход **`src/core/catalog/client.ts`** — реэкспортит ТОЛЬКО client-safe (types, categories, images, gradient, format), БЕЗ repository. ESLint-правило границ дополнено `"!@/core/*/client"` (whitelist client-входа в обоих блоках). **Client-компоненты импортят из `@/core/catalog/client`, server — из `@/core/catalog`.** Переключены на `/client`: `ProductDetail.tsx`, `MarketplaceLinks.tsx` (рендерится внутри ProductDetail). `ProductCard.tsx` остался на server-barrel (рендерится только в server-компонентах). **Для Фазы 1: client-формы админки берут `@/core/catalog/client`.**
- 7 файлов переключены с `@/lib/product` на `@/core/catalog`(+`/client`). `FeaturedProducts`, `generateMetadata`, `ProductPage` — async+await. `comingSoon` → `status === 'coming_soon'`, `variants` как обязательный массив. Grep `@/lib/product` → только `src/data/products.ts:1` (удалится в шаге 8).

### Шаг 8 (выполнено, 2026-05-29)

- **ВСЕ 40 e2e зелёные**, build ок, grep `@/data/products`/`@/lib/product` по ВСЕМУ репо = 0.
- `src/data/products.ts`, папка `src/data/`, `src/lib/product.ts` — удалены. `lib/gradients.ts`, `lib/blog.ts` — сохранены.
- Данные переехали в `src/core/db/seed-data.ts` с локальным типом `LegacyProduct` (независим от core/catalog). seed.ts импортит `./seed-data`. Re-seed работает (те же 10/5/5/13/13/51).
- ESLint: три блока про `@/data/products` (запрет + исключения lib/product.ts и seed.ts) удалены. Module boundaries остались.
- **ПРОПУЩЕННЫЙ ПЛАНОМ ПОТРЕБИТЕЛЬ:** `scripts/check-images.ts` (npm `images:check`) импортил `getAllProducts` из `@/lib/product` — план искал потребителей только в `src/`, а это вне `src/`. Переключён на `import { products } from '../src/core/db/seed-data'` (относительный путь, не нарушает границы, не зависит от БД — это чистая проверка файлов картинок). `images:check` работает. **Урок: grep потребителей делать по всему репо, не только src/.**

---
