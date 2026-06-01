# Review: Code

## Критичное (блокирует выполнение)

### 1. `admin-crud-media.spec.ts` — сломается после шага 1

Файл: `e2e/admin-crud-media.spec.ts`, строка 43.

Тест **явно заполняет поле `#slug`** вручную через `page.locator('#slug').fill(TEST_SLUG)`. После шага 1 поле `#slug` становится `readOnly` всегда на create, и `fill()` в Playwright не работает на `readOnly`-инпуте — тест упадёт на шаге «create a product».

Что нужно сделать: в шаге 1 (или в шаге 5) обновить `admin-crud-media.spec.ts` — убрать `fill('#slug', ...)` и вместо этого заполнять `#name` так, чтобы автогенерированный slug совпадал с `TEST_SLUG = 'e2e-test-product'` (кириллица здесь не нужна — имя `'E2E Test Product'` даст другой slug). Либо изменить тест так, чтобы он использовал `#name` и потом читал получившийся slug из поля.

Текущий тест пишет `name = 'E2E Test Product'` и `slug = 'e2e-test-product'`. После шага 1 slug будет автогенерироваться из name, и `slugify('E2E Test Product')` даст `'e2e-test-product'` — совпадёт (латиница + цифры проходят без изменений). Но строка `fill('#slug', ...)` всё равно бросит ошибку на `readOnly`-инпуте. Строку надо удалить — это обязательное исправление внутри шага 1.

---

### 2. `inArray` уже импортирован, но нет `and` для storefront-функций с двумя условиями

Файл: `src/core/catalog/repository.ts`, строка 2.

`inArray` уже есть в импорте (`import { eq, ne, and, inArray } from 'drizzle-orm'`). Это хорошая новость — `getStorefrontProductsByCategory` и `getStorefrontRelatedProducts` потребуют `and(inArray(...), eq(...))`, и импорт не нужно добавлять. Проблем нет, просто подтверждение что план верен.

---

## Важное (стоит исправить до начала)

### 3. `STOREFRONT_VISIBLE` — строковые значения статусов корректны, но план не уточняет тип

Файл: `src/core/catalog/repository.ts`, строки 168–173 (`ProductStatusValues`).

Значения в `ProductStatusValues`: `['draft', 'published', 'archived', 'coming_soon']`. Строки `'published'` и `'coming_soon'` в плане (шаг 3) совпадают с этими значениями точь-в-точь — расхождений нет.

Однако: для `inArray(schema.products.status, STOREFRONT_VISIBLE)` нужно, чтобы Drizzle принял тип. `schema.products.status` — колонка с enum (Drizzle inference). `STOREFRONT_VISIBLE` надо объявить как `const STOREFRONT_VISIBLE = ['published', 'coming_soon'] as const` или явно типизировать как `ProductStatus[]`. Без `as const` TypeScript может вывести `string[]`, и Drizzle может выдать type error. Шаг 3 об этом не говорит — стоит добавить в checklist.

---

### 4. `getStorefrontProducts` в шаге 3 — `FeaturedProducts.tsx` берёт `all.slice(0, 4)`

Файл: `src/components/home/FeaturedProducts.tsx`, строка 7–8.

Сейчас: `const all = await getAllProducts(); const featured = all.slice(0, 4);`. После перехода на `getStorefrontProducts()` результат будет уже отфильтрован по статусу — это правильно. Но порядок не детерминирован (нет `ORDER BY` в `baseSelect`). Это не баг от плана, существующая особенность — упоминания в плане нет. Не блокер, просто факт.

---

### 5. `getStorefrontProductsByCategory` при `category === null` — нужно вызывать `getStorefrontProducts`, не `getAllProducts`

Файл: `src/core/catalog/repository.ts`, строка 134.

Текущий `getProductsByCategory`: при `category === null` возвращает `getAllProducts()`. Шаг 3 описывает `getStorefrontProductsByCategory(category | null)` — при null должна вызываться `getStorefrontProducts()` (а не `getAllProducts()`). Это логично и упомянуто в плане, но не выделено явно в чеклисте критериев — легко забыть написать рекурсию на правильную функцию.

---

### 6. `product.spec.ts` — тест `nonexistent-slug → 404` продолжит работать, но новый сценарий (draft-товар → 404) пересекается

Файл: `e2e/product.spec.ts`.

Тест ожидает 404 на `/catalog/nonexistent-slug`. После шага 3 `getStorefrontProductBySlug` вернёт `undefined` и для draft-товаров — это тоже 404. Коллизий нет, тест не сломается. Однако в шаге 5 e2e нужно создавать тестовый товар с уникальным slug, иначе возможно наложение с `TEST_SLUG = 'e2e-test-product'` из `admin-crud-media.spec.ts`. Workaround — разные slugs или `afterAll db:seed` (уже предусмотрен).

---

## Мелочи (можно по ходу)

### 7. `ProductCard.tsx` импортирует из `@/core/catalog` (server barrel), а не из `@/core/catalog/client`

Файл: `src/components/ProductCard.tsx`, строка 3.

`import { CATEGORY_LABELS, formatPrice, getProductGradient, type Product } from '@/core/catalog'`. `ProductCard` — server component (нет `'use client'`), поэтому импорт из barrel (`@/core/catalog`) допустим. Шаг 4 добавляет `product.label?.badge` — не потребует менять импорт. Проблем нет.

---

### 8. `step_2_specs_editor.md` — фильтрация пустых пар: условие только по `label`, но не по `value`

Файл: шаг 2, описание `onSubmit`.

Зафиксировано: «фильтровать пары, где `label.trim()===''`». Но допустима пара с пустым `value` и непустым `label` (например, «Материал» без значения). Это может создать некрасивую строку в таблице specs на витрине. Не критично — правило корректно по смыслу (пустой label = бессмысленная строка), но при реализации стоит дополнительно фильтровать и `value.trim()===''` чтобы не сохранять полупустые пары.

---

### 9. `getAllProductSlugs` — нигде не используется на витрине

Подтверждено грепом: функция объявлена в `repository.ts` (строка 126) и не вызывается нигде в `src/` кроме самого объявления. Шаг 3 верно сомневается — `getStorefrontProductSlugs` добавлять не нужно (нет потребителя).

---

### 10. `ProductDetail` — `activeVariant` может быть `undefined`

Файл: `src/components/product/ProductDetail.tsx`, строка 36.

`const activeVariant = variants.find((v) => v.id === activeColor)`. Если `variants` пуст (coming_soon товар с пустым `variants: []` — теоретически возможно), то `activeVariant` будет `undefined`. Но ветка `coming_soon` уже перехвачена раньше (`if (product.status === 'coming_soon') return <ProductDetailComingSoon ...>`), так что до строки 36 доходят только non-coming_soon товары. При добавлении размеров (`activeVariant.skus`) шаг 4 должен использовать `activeVariant?.skus ?? []` — план это явно не упоминает, но это стандартная защита.

---

## Не найдено проблем

- **`productToInput` пробрасывает `specs`**: подтверждено, `product-mapper.ts` строка 30 — `specs: p.specs` на месте.
- **`mapProduct` пробрасывает `specs`**: строка 44 — `specs: row.specs` на месте.
- **`productInputSchema` содержит `specs`**: строка 214 — `z.array(z.object({label, value})).optional()` на месте.
- **`EMPTY_INPUT` имеет `status: 'draft'`**: строка 30 — на месте, новые товары создаются черновиком.
- **Slug-поле на create имеет `onChange`**: строки 154–156 — да, сейчас `onChange: (e) => patch({ slug: e.target.value })` присутствует. Шаг 1 корректно описывает что нужно убрать.
- **`activeVariant` уже вычислен**: строка 36 `ProductDetail.tsx` — да, вычислен до рендера инфо-колонки.
- **ESLint границы модулей и `src/lib/slugify.ts`**: новый файл `src/lib/slugify.ts` находится вне `@/core/*` и `@/marketplace/*` — никаких ограничений из `eslint.config.mjs` на него нет. Импорт из `ProductForm.tsx` как `@/lib/slugify` не нарушает ни одно из правил.
- **`inArray` уже импортирован в repository.ts**: строка 2 — да, уже есть. Storefront-функции добавить без изменения импортов.
- **Статусные значения `STOREFRONT_VISIBLE` совпадают с реальным enum**: `'published'`, `'coming_soon'` соответствуют `ProductStatusValues` и `ProductStatus` из contracts.
- **Админка не будет затронута**: `admin/catalog/page.tsx` и `edit/page.tsx` используют `getAllProducts`/`getProductBySlug` — эти функции не меняются.
