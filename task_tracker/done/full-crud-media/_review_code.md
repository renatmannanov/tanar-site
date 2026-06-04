# Review: Code

> Автор: code-reviewer agent, 2026-06-01
> Проверено: PLAN.md + step_1..8.md + progress.md + 15 файлов кода

---

## Критичное (блокирует выполнение)

### 1. `sharp` в `devDependencies` — упадёт на продакшен-образе
**Файл:** `package.json`, строка `"sharp": "^0.34.5"` в `devDependencies`.

Sharp уже установлен, но лежит в `devDependencies`. При `npm ci --production` (типичный Docker-слой) он не устанавливается. На рантайме `require('sharp')` выбросит `Cannot find module 'sharp'`. Шаг 2 пишет `npm i sharp` — это верно, но нужно явно `npm i sharp` (без `--save-dev`), чтобы переместить в `dependencies`. **Без этого `npm run build` на чистом CI упадёт.**

### 2. Сломаются два ассерта в `e2e/admin.spec.ts` сразу после шагов 3 и 5
**Файл:** `e2e/admin.spec.ts`, строки 48, 59–60.

```
// строка 48 — тест «correct password»:
await expect(page.getByRole('button', { name: 'Создать товар' })).toBeDisabled();

// строки 59–60 — тест «edit form is prefilled»:
await expect(page.getByRole('button', { name: 'Удалить товар' })).toBeDisabled();
await expect(page.getByText('Загрузка фото — Доступно в Плане C')).toBeVisible();
```

Шаг 3 активирует кнопку «Создать товар» → тест строки 48 упадёт.
Шаг 4 активирует «Удалить товар» → строка 59 упадёт.
Шаг 5 заменяет заглушку «Загрузка фото — Доступно в Плане C» на рабочий блок → строка 60 упадёт.

В плане написано «Прежние 45 e2e не сломаны» как критерий готовности — это условие уже нарушено по умолчанию. **Нужно обновить `admin.spec.ts` в шагах 3/4/5 или перед ними.** В шагах это не упомянуто.

### 3. `@core/media/index.ts` экспортирует только типы/интерфейс — `store.ts` нарушит ту же границу модулей
**Файл:** `src/core/media/index.ts`.

Шаг 2 добавляет `src/core/media/store.ts` с импортами `node:fs`, `sharp`, `@/core/db`. Шаг 5 требует, чтобы `VariantPhotos.tsx` (`'use client'`) мог импортировать `MediaAsset` из `@/core/media`. Сейчас `@/core/media` экспортирует только типы — это ок. Но после реализации `store.ts`, если `index.ts` реэкспортирует его (`export * from './store'`), тип `MediaStore` (интерфейс) останется safe — **НО** если в `index.ts` попадёт что-то кроме типов (например `export const mediaStore = ...`), это немедленно потянет `node:fs`/`sharp` в client-бандл.

Шаг 2 говорит «реэкспорт из index» без уточнения, что именно реэкспортировать. Шаг 5 предупреждает «проверить, что `@/core/media` index НЕ тянет `node:fs`/sharp» — но это замечено только как сноска. **Нужно явно зафиксировать: `index.ts` экспортирует только типы; экземпляр `mediaStore` создаётся и экспортируется только из `store.ts`, а server-layer (media-actions.ts) импортирует напрямую `@/core/media/store`.** Если этого не сделать — `build` упадёт с тем же `Can't resolve 'tls'`.

---

## Важное (стоит исправить до начала)

### 4. `upsertVariantTree` для update не использует `onConflictDoUpdate` — придётся делать SELECT + ручной diff
**Файл:** `src/core/catalog/repository.ts`, функция `updateProduct`.

В плане (шаг 1) написана логика «загрузить существующие → diff → UPDATE/INSERT/DELETE». Это корректно и реализуемо. Но план не уточняет, что Drizzle (`onConflictDoUpdate`) не подходит здесь напрямую: `onConflictDoUpdate` требует `INSERT ... ON CONFLICT DO UPDATE SET ...` и не возвращает id существующей строки (`returning()` вернёт id только если произошёл INSERT или Postgres 15+ с `RETURNING` при update). Для diff-логики, где нужен `id` существующего варианта (чтобы найти его SKU), единственный надёжный путь — SELECT-первым.

**Конкретная проблема:** план пишет «загрузить существующие варианты (`id, colorId`)» — это SELECT, после которого делаем UPDATE или INSERT отдельно. Это правильно, но тогда `onConflictDoUpdate` не нужен вовсе — план его и не упоминает для вариантов. Всё ок. Но нужно убедиться, что реализатор не попробует заменить это на `onConflictDoUpdate` — тогда не получить `id` существующей строки для последующего SKU-upsert. **Уточнить в шаге 1: для вариантов использовать SELECT → UPDATE/INSERT, НЕ `onConflictDoUpdate`, потому что нужен `id` для SKU.**

### 5. `ProductCard` импортирует `@/core/catalog` (не `/client`) — после шага 6 может стать проблемой если page.tsx не server-only
**Файл:** `src/components/ProductCard.tsx`, строка 4.

```ts
import { CATEGORY_LABELS, formatPrice, getProductCardImage, getProductGradient, type Product } from '@/core/catalog';
```

`ProductCard` — server component (нет `'use client'`). Пока это работает. Шаг 6 добавляет проп `imagesByVariantId?: Record<string, MediaAsset[]>` в `ProductCard`. `MediaAsset` — тип из `@/core/media`. Если `ProductCard` останется server-компонентом, всё ок. Но если кто-то добавит `'use client'` или компонент окажется в client-дереве — `@/core/catalog` потянет postgres. **Рекомендация:** в шаге 6, когда меняется `ProductCard`, явно проверить что `'use client'` не добавляется, и добавить комментарий в файл.

### 6. `createProductAction` — `redirect()` после `revalidatePath` → URL редиректа строится из `input.slug`, а не из `parsed.slug`
**Файл:** шаг 3, описание `createProductAction`.

В плане написано: `redirect('/admin/catalog/' + input.slug + '/edit')`. Но внутри action нужно парсить через `productInputSchema.parse(input)` (как в `updateProduct`), и `redirect` делать с `parsed.slug` — иначе если Zod трансформирует/нормализует slug, URL окажется неправильным. Смотря на текущий `updateProductAction` — там `safeInput` уже force-slug из маршрута; для create slug берётся из формы (нет route-slug). **Мелочь, но лучше использовать `parsed.slug` в redirect-е.**

### 7. `CategoriesGrid` — план шага 6 обещает переключить на `media_assets`, но реальный компонент показывает категории (не товары) с хардкоженными градиентами
**Файл:** `src/components/home/CategoriesGrid.tsx`.

CategoriesGrid рендерит 4 тайла категорий (`jackets/pants/tshirts/polo`) с декоративными градиентами — это не отдельные товары, а категорийные плашки. В них нет `product` пропа и нет `variants`. Шаг 6 упоминает `CategoriesGrid` как потребителя, которому нужно передать `imagesByVariantId` — но там нечего передавать, это не карточка товара.

**Вероятно план имеет в виду** главную страницу (`src/app/(public)/page.tsx`), которая рендерит `FeaturedProducts` (с `ProductCard`) — но это отдельный компонент. `CategoriesGrid` сам по себе не нуждается в изменениях для медиа. **Шаг 6 нужно скорректировать: убрать `CategoriesGrid` из списка потребителей медиа.**

### 8. Страницы витрины не передают `images` в `ProductDetail`/`ProductCard` — шаг 6 затрагивает не только компоненты, но и server pages
**Файлы:** `src/app/(public)/catalog/page.tsx`, `src/app/(public)/catalog/[slug]/page.tsx`, `src/app/(public)/page.tsx`.

`ProductDetail` и `ProductCard` получают `product: Product`. Шаг 6 предлагает грузить `listProductImages(product.id)` на витринных страницах и передавать пропом. Но `Product` не имеет `id` в read-типе (проверяем `types.ts` — поля `id` нет, только `slug`). Значит, нужно либо:
- добавить `id` в `Product` read-тип (изменение схемы), ИЛИ
- получать `productId` через отдельный запрос по slug, ИЛИ
- добавить вспомогательную функцию `listProductImagesBySlug(slug)` в media.

**Это не упомянуто в шаге 2 или 6.** Нужно решить до начала шага 6.

---

## Мелочи (можно по ходу)

### 9. `skuInputSchema` не имеет `reservedQty` — маппер правильно дропает его
**Файл:** `src/core/catalog/repository.ts`, строка 180–188. `src/app/admin/(protected)/catalog/product-mapper.ts`.

В шаге 1 есть уточнение «маппер может дропать reservedQty — это ОК». Проверка: `skuInputSchema` действительно не содержит `reservedQty` (строки 180–188 репозитория). Маппер (`product-mapper.ts`) тоже не прокидывает его. Всё согласованно, менять не нужно. **Нет расхождения.**

### 10. `ProductDetail` — `'use client'` компонент — импортирует `getProductGalleryShots` из `@/core/catalog/client`
**Файл:** `src/components/product/ProductDetail.tsx`, строка 9.

После шага 6 `getProductGalleryShots` из `images.ts` больше не используется в `ProductDetail` — функция будет заменена на данные из media. Но `getProductGalleryShots` будет по-прежнему экспортироваться из `@/core/catalog/client` (если не убрать). Старый импорт нужно убрать в шаге 6, иначе TypeScript предупредит об unused import. Не критично, но нужно не забыть.

### 11. `e2e/admin-crud-media.spec.ts` — `afterAll` использует `node:fs` rm — нужно убедиться в async/await
**Файл:** шаг 7, описание afterAll.

Playwright `afterAll` — async. `fs.rmSync` (синхронный) внутри него работает, но лучше явно. Это мелочь стиля, не блокер.

### 12. Тип `MediaUploadInput` не имеет `slug` — план шага 2 говорит добавить `slug?: string`
**Файл:** `src/core/media/index.ts`, строка 29–34.

`MediaUploadInput` сейчас: `{ scope, productId?, variantId?, key?, alt? }` — нет `slug`. Шаг 2 это замечает и говорит добавить. Зафиксировано верно.

### 13. `ConfirmButton` принимает `onConfirm: () => void` — но `deleteProductAction` async
**Файл:** `src/components/admin/ui/ConfirmButton.tsx`, строка 13 (тип `onConfirm`).

В шаге 4 `onConfirm` зовёт `deleteAction()` в `startTransition`. `startTransition` принимает sync-коллбэк, но внутри него можно делать async с `startTransition(async () => { await ... })` в React 19. Текущий тип `onConfirm: () => void` не примет async-функцию без явного игнора. Нужно либо изменить тип на `() => void | Promise<void>`, либо оборачивать снаружи. Шаг 4 описывает это через `startTransition` в `ProductForm` — то есть `onConfirm` останется sync-оберткой, что ок. Проблема только если реализатор попытается передать async напрямую.

---

## Не найдено проблем

- **Unique-констрейнты для upsert:** `product_variants_product_color_uq(product_id, color_id)` и `skus_variant_size_uq(variant_id, size)` — оба присутствуют в схеме (`schema.ts` строки 69, 98). Ключи upsert в плане корректны.
- **Drizzle `onConflictDoUpdate` API:** метод существует в установленной версии drizzle-orm (подтверждено из `insert.d.ts`). Для SKU-upsert он подходит, если не нужен returning-id (id существующих SKU не нужен для upsert-логики SKU).
- **`media_assets` в схеме:** таблица уже создана (`schema.ts` строки 103–134), каскады на `productId` и `variantId` прописаны. Миграция не нужна — план это подтверждает.
- **`requireAdmin()` паттерн:** текущий `updateProductAction` правильно вызывает `requireAdmin()` первой строкой, `redirect()` вне try/catch. Шаги 3/4 копируют тот же паттерн — это верно.
- **`sharp` — HEIC поддержка:** sharp поддерживает `heif` формат (подтверждено), HEIC входит в него. Валидация по формату в шаге 2 корректна.
- **`sharp` уже в devDeps и установлен:** `npm i sharp` переместит его в `dependencies` — это нужный шаг (критичное #1 выше), сам бинарь уже есть.
- **`ProductForm` получает `deleteAction` пропом:** текущая сигнатура `Props` не имеет `deleteAction` — шаг 4 добавляет его. Паттерн (bound server action через проп) идентичен тому, как работает `action` пропа — это поддерживается Next 15.
- **`params` в edit page — async (`await params`):** уже реализовано в `[slug]/edit/page.tsx` строка 16. Шаг 5 должен сделать то же для новой `/catalog/new/page.tsx` — там params нет (статический маршрут), проблемы нет.
