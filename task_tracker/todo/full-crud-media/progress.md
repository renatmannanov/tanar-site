# Progress Log — Полный CRUD + фото (План C)

## Контекст для агента

### Что уже готово (проверено 2026-06-01)
- **Write-контракт** `src/core/catalog/repository.ts` (экспорт из `@/core/catalog`):
  - `createProduct(input)` (~276): insert с нуля через `insertVariantTree`.
  - `updateProduct(slug, input)` (~298): СЕЙЧАС delete+insert дерева вариантов → **шаг 1 переписывает на upsert**.
  - `deleteProduct(slug)`: каскад, throw на неизвестный slug. (Готов, шаг 4 его только зовёт.)
  - `insertVariantTree(tx, productId, input)` (~225): хардкодит `reservedQty: 0`.
  - `productColumns(input)` (~258): product-level колонки.
  - Read: `getAllProducts/getProductBySlug/getProductsByCategory/getRelatedProducts` — JOIN products×variants×skus, `groupRows` (~68). **Фото в Product сейчас НЕ читаются.**
- **Схема БД** `src/core/db/schema.ts`:
  - `product_variants`: unique `product_variants_product_color_uq (product_id, color_id)`. → ключ upsert вариантов.
  - `skus`: unique `skus_variant_size_uq (variant_id, size)`, `stockQty`, `reservedQty`. → ключ upsert SKU.
  - `media_assets` (~103): `id, scope, url, sortOrder, productId (cascade), variantId (cascade), view, model, role, key, alt, createdAt`. **Уже существует — реализация media НЕ меняет схему, db:generate миграцию НЕ создаёт.**
- **Типы:** `Product` (read, поле `price`, `variants[].id/label`), `ProductInput`/`VariantInput`/`SkuInput` (write, `z.input` из repository.ts ~218-220). `Sku.reservedQty` есть в read-типе. **Read↔write имена РАЗНЫЕ** (price↔priceBase, id↔colorId, label↔colorLabel) — маппер `productToInput` обязателен.
- **MediaStore-контракт** `src/core/media/index.ts`: `list/upload/remove` (+ типы `MediaAsset`/`MediaUploadInput`). **Реализации НЕТ** — шаг 2 добавляет impl + метод `reorder`.
- **Витрина строит фото ПО КОНВЕНЦИИ ИМЁН, не из БД:** `src/core/catalog/images.ts` — `getProductGalleryShots`/`getProductCardImage`/`productImagePath` вычисляют пути `{view}-{model}-...webp` из `variant.models`/`hasFlatShots`. Файлов для боевых 12 товаров нет → витрина показывает градиент. **Шаг 6 переключает на `media_assets`.**
  - Потребители (обновить в шаге 6): `src/components/product/ProductDetail.tsx` (галерея), `src/components/ProductCard.tsx` (карточка каталога), `src/components/home/CategoriesGrid.tsx` (главная). Градиент-фолбэк: `src/core/catalog/gradient.ts`.

### Что уже готово в админке (План B — `task_tracker/done/admin-editing/`)
- `ProductForm` `src/components/admin/ProductForm.tsx`: `mode: 'create'|'edit'`, controlled `useState<ProductInput>`, submit через `useTransition` + проп `action(input)`. Кнопки «Создать»/«Удалить»/блок «Фото» — СЕЙЧАС `disabled` (заглушки). `EMPTY_INPUT` для create уже есть.
- `ConfirmButton` `src/components/admin/ui/ConfirmButton.tsx` — Radix Dialog подтверждение (готов, шаги 4/5 переиспользуют).
- UI-примитивы `src/components/admin/ui/`: Button/Input/Textarea/AutoTextarea/Select/Label/Dialog/cn.
- Маппер `productToInput`: `src/app/admin/(protected)/catalog/product-mapper.ts` — СЕЙЧАС дропает `reservedQty` (шаг 1 возвращает), есть `cleanMarketplaces`.
- Server actions: `src/app/admin/(protected)/catalog/actions.ts` (`updateProductAction`). Шаги 3/4 добавляют create/delete сюда же или рядом.
- Edit-page: `src/app/admin/(protected)/catalog/[slug]/edit/page.tsx` (`requireAdmin`, `getProductBySlug`, `productToInput`, `.bind(null, slug)`).
- Список: `src/app/admin/(protected)/catalog/page.tsx` (кнопка «Создать товар» disabled).

### Грабли (НЕ повторить — из Плана B)
- **Client-компоненты админки импортят `@/core/catalog/client`, НЕ barrel `@/core/catalog`** — barrel тянет `repository.ts`→postgres в client-бандл, **ломает `build`** (`Can't resolve 'tls'`). typecheck/lint это НЕ ловят → **после client-кода ГОНЯТЬ `build`**.
- `updateProductAction` форсирует `slug` из маршрута (`{...input, slug}`). `redirect()` — ВНЕ try/catch (иначе catch проглотит). `requireAdmin()` из `@/lib/require-admin` первой строкой в каждом server action и protected page.
- `Product.marketplaces` может нести undefined-ключи — `cleanMarketplaces` в маппере фильтрует (не сломать при правках маппера в шаге 1).
- Маршруты админки — в группе `(protected)` (сайдбар-shell); URL без `(protected)`. Витрина — в `(public)`.

### КРИТИЧНЫЕ факты
- **PowerShell** на Windows (не bash-инлайн `VAR=val`). Пути с `/` в Bash-tool ок.
- **Next 15.5 + Turbopack**, React 19. Server actions принимают `FormData` с `File` — это путь для **upload фото** (НЕ через controlled `ProductForm`-state; файлы и controlled-формы не дружат). `cookies()`/`params` — async (`await`).
- Postgres порты **5442/5443**. Перед build-рантаймом/e2e: `npm run db:up && npm run db:seed`.
- `sharp` — добавить в deps (`npm i sharp`). На Windows ставится с prebuilt-бинарём.
- e2e: Playwright порт **3001**, `reuseExistingServer`. env `.env.local` через `@next/env` в `playwright.config.ts` (настроено в Плане B). `afterAll` → `db:seed` страховка.
- Если меняется `schema.ts` — `npm run db:generate` + `npm run db:migrate`. **media_assets уже в схеме** — фото-реализация миграцию не требует.

### Загрузка фото — как тестировать в e2e
Playwright `setInputFiles` на `<input type="file">`. Готовить тестовый файл-картинку (маленький webp/png в `e2e/fixtures/`). `afterAll` чистит загруженные файлы из `public/images/products/<test-slug>/` + `db:seed`.

## Learnings

### Шаг 1 (updateProduct → upsert) — done
- `updateProduct` переписан на SELECT+diff upsert (`upsertVariantTree`/`upsertSkus` в `repository.ts`). Ключи: вариант по `colorId`, SKU по `size`. `onConflictDoUpdate` НЕ используется (мог бы обнулить `reservedQty`). При UPDATE существующего SKU `reservedQty` НЕ в `.set()` → сохраняется; новые SKU — `reservedQty:0`.
- Инвариант проверен tsx-тестом (удалён): сохранение боевого товара (правка name + новый размер) сохраняет `variantId`, `skuId` существующих, `reservedQty=7`; новый размер вставлен. ✅
- **Orphan-файлы (отложенный долг, НЕ чинить сейчас):** когда `colorId` исчезает из формы → `upsertVariantTree` делает DELETE варианта → каскад сносит строки `media_assets`, но ФАЙЛЫ в `public/images/products/<slug>/` остаются на диске. Тот же остаток, что и при `deleteProduct` (шаг 4). Чистка файлов — отдельный пункт (хук в deleteProduct / `MediaStore.removeByProduct` / `removeByVariant`) на потом. Диск дёшев, не блокер.
- `tsx`-скрипты для dev-БД требуют `--env-file=.env.local` (как `db:seed`), иначе `DATABASE_URL is not set`.
- `npm run db:seed` печатает Postgres NOTICE `truncate cascades to "inventory_log"/"order_items"` — это норма (reset через TRUNCATE CASCADE), НЕ ошибка.

### Шаг 2 (MediaStore) — done
- `sharp@0.34.5` в `dependencies` (перемещён из devDependencies вручную — npm i поставил его в dev).
- **HEIC НЕ поддерживается** prebuilt-sharp на Windows (проверено: `heifsave: Unsupported compression`). **Принимаемые форматы входа: JPG / PNG / WEBP.** AVIF технически декодится, но в UI не афишируем. Детект формата — по MIME + `sharp().metadata().format` (magic bytes), расширение файла не используем.
- Структура media-модуля (грабля client-бандла соблюдена):
  - `types.ts` — чистые типы (`MediaAsset`/`MediaUploadInput`/`MediaStore`), без node-deps.
  - `client.ts` — реэкспорт ТОЛЬКО типов (для `'use client'`).
  - `index.ts` — server: типы + read (`listProductImages(productId)`, `listProductImagesForProducts(ids)`). **НЕ реэкспортит store.**
  - `store.ts` — `mediaStore` impl (sharp+fs+db). Импортить НАПРЯМУЮ `@/core/media/store` из server-actions, НЕ через index.
- `MediaUploadInput` финальная: `{ scope:'product', slug, productId, variantId, alt? }`. Pipeline: `rotate()`(EXIF) → resize max 2000 (inside, withoutEnlargement) → 3×WEBP (1600/800/400, q82) → `public/images/products/<slug>/<uuid>-{w}.webp`. `url` в БД = 1600-версия; меньшие по конвенции (`urlForWidth` подменяет `-1600`→`-800`/`-400`). `sortOrder` = max(variant)+1. alt авто `Фото N`.
- `remove(id)` удаляет все 3 файла + строку (идемпотентно). `reorder(items)` — UPDATE sortOrder в транзакции.
- Read-тип обогащён: `Product.id` (=products.id) и `ProductColor.variantId` (=product_variants.id, линк к media_assets.variantId). `mapProduct`/`mapVariant` прокидывают. Маппер `productToInput` новые поля игнорит (не сломан).
- Проверено tsx-тестом (удалён): upload реального JPG → 3 webp + строка, 2-й asset sortOrder+1, remove чистит файлы+строку. `npm run build` зелёный (sharp/fs НЕ в client).
- **Demo-фолбэк-картинки** в `public/images/products/{hoodie-alatau,hoodie-turgen,light-jacket-tengri,shell-jacket-khan,tshirt-tanar}/` — старая конвенция имён (НЕ боевые slug'и, на витрине не подтягиваются). Оставлены, шаг 6 не трогает.

### Шаг 3 (admin create) — done
- `createProductAction(input)` в `actions.ts`: `requireAdmin` → `createProduct` (try/catch) → ВНЕ catch revalidate + `redirect('/admin/catalog/<slug>/edit')`.
- Страница `new/page.tsx`: `<ProductForm mode="create" action={createProductAction}/>` (без initial → EMPTY_INPUT).
- Кнопка «Создать товар» в списке → `<Link href="/admin/catalog/new">` (стилизован под кнопку; `Button` не поддерживает asChild, использован голый Link). Импорт Button из page.tsx убран.
- slug-паттерн `^[a-z0-9-]+$` добавлен в `productInputSchema` (repository.ts).
- **Баг Плана B пофикшен:** в `ProductForm` поле `#slug` на create было `readOnly={false}` НО без `onChange` → ввести slug было нельзя. Теперь на create редактируемо с `onChange` + подсказка по charset. На edit — readOnly как было.
- e2e admin.spec: ассерт «Создать товар disabled» → `toHaveAttribute('href','/admin/catalog/new')`. Все 6 admin e2e зелёные.
---
