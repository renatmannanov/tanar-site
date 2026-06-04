# Progress Log — Storefront Completion (Фаза 1.5)

## Контекст для агента

### Что уже готово (проверено 2026-06-01, аудитом)
- **Read-функции каталога** `src/core/catalog/repository.ts`:
  - `getAllProducts()` (~116), `getProductBySlug(slug)` (~121), `getProductsByCategory(cat|null)` (~131, при null → getAllProducts), `getRelatedProducts(current, limit=3)` (~139), `getAllProductSlugs()` (~126). Все через `baseSelect()` (JOIN products×variants×skus) + `groupRows`.
  - **ВАЖНО (Блок B):** `getAllProducts` и `getProductBySlug` зовутся И публично, И в админке:
    - Публично: `FeaturedProducts.tsx` (getAllProducts), `catalog/page.tsx` (getProductsByCategory), `catalog/[slug]/page.tsx` (getProductBySlug + getRelatedProducts).
    - Админка: `admin/catalog/page.tsx` (getAllProducts), `admin/catalog/[slug]/edit/page.tsx` (getProductBySlug).
    - → НЕЛЬЗЯ просто добавить фильтр в эти функции (сломает админку). Делать ОТДЕЛЬНЫЕ storefront-варианты.
  - `mapProduct` (~34): `id, slug, name, category, status, price, currency, description, specs, label, care, gradient, variants[], marketplaces`. **`specs: row.specs` (~44) — уже проброшен.**
- **Read-тип** `src/core/catalog/types.ts`: `Product.specs: {label,value}[]`, `Product.care?`, `Product.label?: {badge,sub}`, `Product.status`. `ProductColor.skus[]` (Sku: size, ruSize?, ...).
- **Write-схема** `repository.ts` ~199: `productInputSchema` — `slug` имеет regex `^[a-z0-9-]+$` (~202), `specs: z.array({label,value}).optional()` (~214), `status` enum optional. **specs уже в схеме.**
- **Маппер** `src/app/admin/(protected)/catalog/product-mapper.ts`: `productToInput` — **`specs: p.specs` уже пробрасывает** (~30). Для Блока D правки маппера НЕ нужны.

### ProductForm (`src/components/admin/ProductForm.tsx`)
- Client. `mode: create|edit`, controlled `useState<ProductInput>`. `EMPTY_INPUT` (~21) уже `status: 'draft'`.
- **slug-поле (~115-...):** на create редактируемо с `onChange` (фикс из Плана C), на edit `readOnly`. **Блок A:** убрать ручной onChange, slug пересчитывать из `name`, поле read-only всегда; показывать сгенерированный.
- patch-функции: `patch`, `patchVariant`, `patchSku`, `addVariant/removeVariant`, `addSku/removeSku`. **Блок D:** добавить аналогичные для specs (patchSpec/addSpec/removeSpec) + UI-секцию.
- Кнопки внизу: Создать/Сохранить, Отмена (Link), Удалить (ConfirmButton, только edit). Фото-блок per-variant — `VariantPhotos`.
- **Грабли Плана B/C:** client-компоненты импортят `@/core/catalog/client` (НЕ barrel) и `@/core/media/client`. После client-кода ГОНЯТЬ `build` (typecheck/lint не ловят утечку postgres/sharp/fs).

### ProductDetail (`src/components/product/ProductDetail.tsx`) — Блок C
- Client. Рендерит: галерею (media_assets, фолбэк градиент), name (h1 ~112), price (~116), цвета+hex (~120, при >1), description (параграфы ~143), specs (`<dl>` при `specs.length>0` ~149). `coming_soon` → отдельный `ProductDetailComingSoon`.
- **НЕ показаны (добавить):** размеры активного цвета (`activeVariant.skus` → size + ruSize), care (блок «Уход»), label.badge (рядом с name/price).
- `activeVariant` уже вычислен (~..); `activeVariant.skus` — массив Sku.

### ProductCard (`src/components/ProductCard.tsx`) — Блок C
- Server. Пропы `{product, image?}`. Рендерит фото/градиент, category, name, price, ColorDots. **Добавить:** бейдж `product.label?.badge` (уголок).

### Витринные страницы — Блок B
- `src/app/(public)/catalog/page.tsx` → `getProductsByCategory` → заменить на storefront-вариант.
- `src/app/(public)/catalog/[slug]/page.tsx` → `getProductBySlug` + `getRelatedProducts` → storefront-варианты; на скрытом товаре `notFound()`.
- `src/components/home/FeaturedProducts.tsx` → `getAllProducts` → storefront-вариант.
- `src/lib/product-images.ts` `primaryImagesFor` — без изменений (работает с любым Product[]).

### КРИТИЧНЫЕ факты (из Плана C, не повторить ошибки)
- **Коммит через PowerShell-tool**, `git add` и `git commit` — РАЗНЫМИ вызовами. БЕЗ двойных кавычек в `@'...'@` here-string (ломают парсинг). НЕ через Bash-tool (лидирующий `@` в subject).
- **НЕ `npm run build` пока жив `npm run dev`** — build затирает `.next` → dev падает ENOENT. Останавливать dev перед build.
- Postgres порты **5442/5443**. Перед build-рантаймом/e2e: `npm run db:up && npm run db:seed`.
- e2e: Playwright порт 3001, `reuseExistingServer`, `workers:1, fullyParallel:false`. `afterAll` → `db:seed`.
- `next.config.ts`: `serverActions.bodySizeLimit: '10mb'` (из Плана C, для фото). Не трогать.
- Транслит-slugify — **client-safe** (нужен в client ProductForm). Без node/server-импортов.

### Боевые данные (факт, аудит)
- 12 товаров: у ВСЕХ `label` заполнен, `specs` ПУСТЫЕ (`[]`). Поэтому характеристик на витрине не видно (нечего показывать) — Блок D даёт возможность их завести.
- Все боевые товары сейчас, вероятно, `published` (проверить SQL при Блоке B: `SELECT status, count(*) FROM products GROUP BY status`). Если все published — фильтр статусов их не скроет (хорошо), а тест-товар draft/archived создавать в e2e.

## Learnings
(заполняется в процессе работы)
---
