# Progress Log — Real Catalog Import + CRUD Foundation

## Контекст для агента

### Источник данных
- **`catalog-snapshot.json`** (эта папка) — единственный источник. 12 товаров / 30 вариантов / 109 SKU. Выверен пользователем. Сырой CSV НЕ открывать (тяжёлый, gitignored).
- Структура снапшота: `products[]` → `variants[]` (colorId/colorLabel/hex) → `skus[]` (size/ruSize/article/stock/marketplace.ozonSku). На товаре: slug, category, name, label{badge,sub}, priceBase, description, care(|null), marketplace{ozonGroupId,priceOzon}.
- `stockUnknown` уже сведён к `stock:0` в снапшоте (13 SKU). Отдельно обрабатывать не нужно.
- `meta.products/variants/skus` = ожидаемые числа для self-check импорта (как в старом seed — без хардкода).

### Где что лежит СЕЙЧАС (факты из кода, проверено 2026-05-29)

**Схема** `src/core/db/schema.ts`:
- `products`: id, slug(uniq), name, category(text), status(default 'published'), priceBase(int), currency, description, specs(jsonb), gradient(nullable), marketplaces(jsonb), timestamps. **НЕТ label, care.**
- `skus`: id, variantId(fk cascade), size, priceOverride(nullable), barcode(nullable), stockQty, reservedQty, timestamps. unique(variantId,size). **НЕТ article, ru_size.**
- `product_variants`: colorId, colorLabel, hex, models(jsonb), hasFlatShots. unique(productId,colorId).
- jsonb типы через `.$type<>()`, импорт типов из `@/core/contracts`.

**Контракты** `src/core/contracts/index.ts`:
- `ProductCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts'` ← МЕНЯЕМ.

**Каталог** `src/core/catalog/`:
- `index.ts` (server) реэкспортит types/categories/images/gradient/format/repository.
- `client.ts` (client-safe) — то же БЕЗ repository. Client-компоненты импортят отсюда.
- `categories.ts`: `CATEGORIES` массив, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `isValidCategory`, `MARKETPLACE_LABELS`.
- `types.ts`: `Product` (slug,name,category,status,price,currency,description,specs,gradient?,variants[],marketplaces?), `ProductColor` (id,label,hex,models,hasFlatShots?,skus[]), `Sku` (id,size,priceOverride?,stockQty,reservedQty). **price (не priceBase) в доменном типе.**
- `repository.ts`: ТОЛЬКО read (getAllProducts, getProductBySlug, getAllProductSlugs, getProductsByCategory, getRelatedProducts). Один JOIN-запрос `baseSelect()` + `groupRows()`. Mapper'ы mapProduct/mapVariant/mapSku. **Write-методов НЕТ — добавляем.**

**Media** `src/core/media/index.ts`: `export {};` — пустой. Заготовка контракта — сюда.

**db** `src/core/db/`:
- `index.ts` экспортит `db`, `queryClient`, `schema`.
- `seed.ts` — текущий демо-сидер (читает `seed-data.ts`, сырые insert, self-check по числам, TRUNCATE CASCADE, guard на tanar_dev/tanar_test, `queryClient.end()`). **Заменяется импорт-скриптом.**
- `seed-data.ts` — демо-каталог (`LegacyProduct`, 10 товаров). **Удаляется.**
- `reset.ts` — TRUNCATE всех таблиц, тот же guard. Оставляем.

**npm-скрипты** (package.json):
- `db:seed` = `tsx --env-file=.env.local -r tsconfig-paths/register src/core/db/seed.ts` — переключить на импорт-скрипт (имя db:seed оставить).
- `db:generate` / `db:migrate` — drizzle-kit.

### Потребители, которые СЛОМАЮТСЯ при смене категорий/данных (правим в шагах 6-7)

- `src/components/Footer.tsx` — хардкод `catalogLinks` с `hoodies`, `t-shirts`. Обновить на новые 5 категорий.
- `src/components/home/CategoriesGrid.tsx` — `homeCategories` хардкод (jackets/hoodies/t-shirts/pants). Обновить (4 плитки — выбрать 4 из 5 категорий).
- `src/app/catalog/page.tsx` — metadata.description «Куртки, худи, футболки, штаны и шорты». Обновить текст. Сами чипы строятся из CATEGORY_ORDER (автоматом).
- `src/app/catalog/[slug]/page.tsx` — использует CATEGORY_LABELS, getProductBySlug, getRelatedProducts. Проверить что компилируется с новым типом.
- `e2e/catalog.spec.ts` — чипы `['Все','Куртки','Худи','Футболки','Штаны','Шорты']` → `['Все','Куртки','Брюки','Шорты','Футболки','Поло']`.
- `e2e/smoke.spec.ts` — `PRODUCT_SLUG='shell-jacket-khan'` (демо, нет в боевом!) → заменить на боевой slug (напр. `jacket-sv7-goretex`). `pants-charyn` (coming_soon демо) — в боевом каталоге coming_soon НЕТ → удалить/переписать тест «Скоро». «catalog shows all 10 product cards» → 12. `catalog filter by jackets` остаётся (jackets есть), но проверить количество.
- `scripts/check-images.ts` — импортит `getAllProducts`/`seed-data` (вне src/!). При удалении seed-data сломается. **Урок Фазы 0: grep потребителей по ВСЕМУ репо, не только src/.** Решить в шаге 5: переключить на снапшот или на БД, либо (если check-images привязан к демо-структуре фото) — пометить устаревшим. Проверить `npm run images:check`.

### КРИТИЧНЫЕ факты (не сломать)

- **Порты Postgres: dev=5442, test=5443** (НЕ 5432). На хосте занят нативный PG.
- **env в tsx-скриптах:** ТОЛЬКО `tsx --env-file=.env.local -r tsconfig-paths/register`. НЕ dotenv внутри скрипта (client.ts читает process.env на top-level import).
- **Node v24 на машине** (engines просит <21) → EBADENGINE warning, не ошибка. tsx cjs НЕ поддерживает top-level await → оборачивать в `async function main(){}; main()`.
- **Предусловие build/e2e:** `npm run db:up && npm run db:seed` (наполнить БД) + `.env.local`. force-dynamic: build сам БД не читает, но рантайм/e2e — читают.
- **ESLint границы:** импорт модулей только через index.ts (или `@/core/*/client`); `core/*` НЕ импортит `marketplace/*`. Внутри модуля — относительные пути.
- **gen_random_uuid()** требует pgcrypto (уже в первой миграции).
- **Доменный тип `Product.price`** (не priceBase) — repository mapper кладёт `row.priceBase → price`. При write-контракте: вход zod-схемы должен мапить обратно `price/priceBase`. Решить единообразно в шаге 3.

### Что НЕ делать в Плане A
- НЕ создавать admin-маршруты `(admin)/` — это План B.
- НЕ делать реальную загрузку фото / sharp — План C. media — только контракт.
- НЕ создавать MediaAsset для боевых товаров (фото нет).
- НЕ грузить Ozon-поля в core.
- НЕ трогать public/images/, scripts/process-images.mjs, assets/, блог.
- НЕ менять reset.ts (кроме случая если добавятся новые таблицы — их тут нет).

## Learnings

### Из ревью плана (2026-05-29, до старта — учтено в step-файлах)
- **ProductCard битый Image при models:[]** — `getProductCardImage` ВСЕГДА возвращает объект (не null). При `models:[]` → `models[0]=undefined` → `src=front-undefined-card-md.webp` (404). Фикс в step_6: guard `defaultVariant.models.length > 0`, иначе `cardImage=null` → Placeholder. Боевые товары все на градиентах (фото нет).
- **TRUNCATE skus CASCADE задевает order_items/inventory_log** (FK sku_id без onDelete; CASCADE truncate идёт по всем ссылающимся таблицам независимо от onDelete). В Плане A они пусты → ок. Импорт строго dev/one-off. Без CASCADE TRUNCATE skus упал бы на FK при непустом order_items.
- **PowerShell, не bash:** инлайн `VAR=val cmd` не работает. Миграция test-БД: `$env:DATABASE_URL = "<test-url>"; npx drizzle-kit migrate`. `DATABASE_TEST_URL` = `postgres://tanar:tanar_test_pw@localhost:5443/tanar_test` (из .env.example).
- **zod care: `.nullable().optional()`** — снапшот имеет `care:null` у 7 товаров; голый `.optional()` не примет null → ZodError. Маппинг: `care: p.care ?? undefined`.
- **check-images.ts** — переключить на снапшот (НЕ no-op), при пустом списке фото `exit 0`. Сначала переключить, потом удалять seed-data, коммит после зелёных проверок.
- **self-check импорта** — добавить проверку значений (jacket-sv7-goretex price=80000, article TANAR-001 существует), не только count.
- **db:up** — предусловие реализации step_1 и step_5 (не только верификации); Docker между Ralph-итерациями может стоять.
- **Footer/CategoriesGrid** — правятся ЦЕЛИКОМ в step_2 (вместе со сменой типов), step_6 их НЕ трогает (убран двойной источник правды).

### Передача в План B (админка-редактирование) — План A завершён 2026-05-29
- write-контракт `createProduct/updateProduct/deleteProduct` в `src/core/catalog/repository.ts` готов и обкатан на 109 SKU реального каталога. Вход — `ProductInput` (zod, поле цены — `priceBase`). Экспортируется из `@/core/catalog` (server). В `client.ts` write-методов НЕТ.
- `updateProduct(slug, input)` сохраняет product.id, заменяет variants/skus ЦЕЛИКОМ (delete+insert в транзакции) — форма админки шлёт товар целиком, без diff/merge.
- `deleteProduct(slug)` — каскад по FK, throw на неизвестный slug.
- media — только контракт (`MediaStore` интерфейс + типы `MediaAsset`/`MediaUploadInput` в `src/core/media/index.ts`), реализация (sharp + insert) — План C.
- В БД боевые 12 товаров / 30 вариантов / 109 SKU. Фото НЕТ → витрина и карточка на градиентах (guard `models.length > 0` в ProductCard; Placeholder в ProductDetail при пустых shots).
- Источник правды каталога — `task_tracker/done/real-catalog-import/catalog-snapshot.json`. Пути в `seed.ts` и `scripts/check-images.ts` обновлены на `done/`. Реимпорт: `npm run db:seed`.
- Категории: `jackets|pants|shorts|tshirts|polo` (единый источник — `CATEGORIES` в `categories.ts`).
---
