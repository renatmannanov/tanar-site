# Шаг 3: Видимость витрины по статусам

> Зависит от: нет (независим от шагов 1/2; правит core/catalog + витринные страницы, не ProductForm).
> Статус: [ ] pending

## Задача

Скрыть `draft` и `archived` товары с витрины. `published` и `coming_soon` — видны покупателю. Админка по-прежнему видит ВСЕ статусы. Прямой заход на скрытый товар → 404.

> **Решение (зафиксировано, без развилок):** ОТДЕЛЬНЫЕ storefront-функции чтения. НЕ менять `getAllProducts`/`getProductBySlug`/`getProductsByCategory`/`getRelatedProducts` — их зовёт админка (см. progress.md: getAllProducts и getProductBySlug используются И публично, И в админке). Витринные страницы переключить на storefront-варианты.

### Видимые статусы (типизировать — иначе Drizzle inArray type error)
```ts
const STOREFRONT_VISIBLE = ['published', 'coming_soon'] as const satisfies readonly ProductStatus[];
```
(draft/archived — скрыты). `ProductStatus` уже импортируется в repository.ts. Сверить значения с `ProductStatusValues` enum в файле (`'draft','published','archived','coming_soon'`).

### Новые функции — `src/core/catalog/repository.ts`
Добавить 4 функции (рядом с существующими). Реализация: переиспользовать `baseSelect()` + добавить `.where(...)` с `inArray(schema.products.status, STOREFRONT_VISIBLE)`, комбинируя с прочими условиями через `and(...)`:
- `getStorefrontProducts(): Promise<Product[]>` — `baseSelect().where(inArray(status, VISIBLE))`.
- `getStorefrontProductsByCategory(category | null)` — **null → `return getStorefrontProducts()`** (НЕ getAllProducts! иначе «Все» покажет скрытые); иначе `where(and(eq(category), inArray(status, VISIBLE)))`.
- `getStorefrontProductBySlug(slug): Promise<Product | undefined>` — `where(and(eq(slug), inArray(status, VISIBLE)))`. Скрытый → undefined → страница даст 404.
- `getStorefrontRelatedProducts(current, limit=3)` — как getRelatedProducts + `inArray(status, VISIBLE)` в `and(...)`.
- Экспорт: `@/core/catalog/index.ts` делает `export * from './repository'` → новые функции экспортируются автоматически. **Проверить это grep'ом index.ts (если именованные экспорты — добавить явно).**
- `getStorefrontProductSlugs` — **НЕ нужен** (`getAllProductSlugs` нигде на витрине не зовётся — подтверждено ревью; не добавлять).

### Переключить витринные страницы
- `src/app/(public)/catalog/page.tsx`: `getProductsByCategory` → `getStorefrontProductsByCategory`.
- `src/app/(public)/catalog/[slug]/page.tsx` — **ДВЕ точки вызова `getProductBySlug`, переключить ОБЕ:**
  1. в `generateMetadata` (иначе draft-товар отдаст `<title>` товара при 404-странице — рассинхрон);
  2. в `ProductPage` (основной render);
  + `getRelatedProducts` → `getStorefrontRelatedProducts`. Скрытый товар → undefined → `notFound()` (проверка `if (!product) notFound()` уже есть).
- `src/components/home/FeaturedProducts.tsx`: `getAllProducts` → `getStorefrontProducts`.
- **Админку НЕ трогать:** `admin/catalog/page.tsx` (getAllProducts) и `edit/page.tsx` (getProductBySlug) остаются на старых функциях — видят все статусы.

## Тесты
- e2e: создать товар, статус draft → НЕ в /catalog, прямой заход → 404; archived → так же; published → виден. Шаг 5.
- Существующие витринные e2e (12 товаров в /catalog) НЕ должны сломаться — **проверить SQL, что все боевые published:** `SELECT status, count(*) FROM products GROUP BY status`. Если все published — 12 карточек остаются.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT status, count(*) FROM products GROUP BY status;"
npm run typecheck
npm run lint
npm run build
npm run dev
# вручную: в админке создать/перевести товар в draft → /catalog его нет, /catalog/<slug> → 404; в admin/catalog он есть
```

## Критерии готовности
- [ ] `getStorefront*` функции добавлены, фильтруют по `status IN ('published','coming_soon')`
- [ ] Витринные страницы (catalog list, product page, related, featured) используют storefront-функции
- [ ] `/catalog/[slug]`: ОБЕ точки (`generateMetadata` И `ProductPage`) переключены на `getStorefrontProductBySlug`
- [ ] `getStorefrontProductsByCategory(null)` зовёт `getStorefrontProducts` (не getAllProducts)
- [ ] `STOREFRONT_VISIBLE` типизирован (`as const satisfies readonly ProductStatus[]`)
- [ ] Админка (список, edit) по-прежнему видит ВСЕ статусы (не тронута)
- [ ] draft/archived товар: нет в /catalog, нет в related/featured, прямой заход → 404; в админке виден
- [ ] Боевые 12 (published) — по-прежнему на витрине (12 карточек), витринные e2e зелёные
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(catalog): storefront visibility by status (hide draft/archived)`
