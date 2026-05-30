# Progress Log — Админка: редактирование (План B)

## Контекст для агента

### Что уже есть (фундамент Плана A, проверено 2026-05-29)
- **Write-контракт** `src/core/catalog/repository.ts`, экспортится из `@/core/catalog` (server):
  - `createProduct(input: ProductInput): Promise<Product>`
  - `updateProduct(slug: string, input: ProductInput): Promise<Product>` — сохраняет product.id, заменяет variants/skus ЦЕЛИКОМ (delete+insert в транзакции). Форма шлёт товар целиком — это ровно его модель.
  - `deleteProduct(slug: string): Promise<void>` — каскад, throw на неизвестный slug.
  - zod-валидация ВНУТРИ (`productInputSchema.parse`) — server action ловит исключение, отдельно валидировать не нужно.
- **Read-контракт** (тот же модуль): `getAllProducts`, `getProductBySlug`, `getProductsByCategory`, `getAllProductSlugs`, `getRelatedProducts`.
- **Типы для формы:**
  - `ProductInput` (вход write): `{ slug, name, category, status?, priceBase, currency?, description, specs?, gradient?, label?{badge,sub}, care?, marketplaces?, variants: VariantInput[] }`.
  - `VariantInput`: `{ colorId, colorLabel, hex, models?, hasFlatShots?, skus: SkuInput[] }`.
  - `SkuInput`: `{ size, ruSize?, article?, priceOverride?, stockQty? }`.
  - `Product` (выход read): поле **`price`** (не priceBase!), `variants[].id`(=colorId), `variants[].label`(=colorLabel), `variants[].hex`, `variants[].skus[]` (`Sku`: id,size,article?,ruSize?,priceOverride?,stockQty,reservedQty). Также `label?`, `care?`.
  - **КРИТИЧНО:** read↔write имена полей РАЗНЫЕ. Маппер `productToInput(p: Product): ProductInput` обязателен: `price→priceBase`, `variant.id→colorId`, `variant.label→colorLabel`, sku поля как есть (drop id/reservedQty). Это adapter в admin-разделе, НЕ в core.
- `CATEGORIES` / `CATEGORY_LABELS` / `CATEGORY_ORDER` / `isValidCategory` — из `@/core/catalog` (есть и в `/client`). Категории: jackets|pants|shorts|tshirts|polo.
- `ProductStatus = 'draft'|'published'|'archived'|'coming_soon'` из `@/core/contracts` (реэкспорт через catalog types).
- **media** — только контракт `MediaStore`/`MediaAsset`/`MediaUploadInput` в `@/core/media`. Реализации НЕТ → фото-слот в форме `disabled`, ничего не вызывает.

### Чего НЕТ в проекте (надо завести)
- **Нет middleware** (`src/middleware.ts` отсутствует).
- **Нет route handlers / server actions** (`'use server'` нигде).
- **Нет route-group**: `src/app/` плоский — `page.tsx, layout.tsx, catalog/, blog/`. Решение плана: завести РЕАЛЬНЫЙ сегмент `src/app/admin/` (НЕ `(admin)` в скобках — проще middleware matcher, явный URL `/admin`).
- **Нет UI-библиотек** (Radix/shadcn). Поставить точечно: `@radix-ui/react-dialog`, `@radix-ui/react-label`. shadcn-примитивы — копией в `src/components/admin/ui/`, без shadcn CLI.

### Что НЕ сломать
- **Root layout** `src/app/layout.tsx` оборачивает ВСЁ в `<Header/><main>{children}</main><Footer/>`. Витринный Header/Footer попадёт и в админку, если не изолировать. Admin-сегмент должен иметь свой `layout.tsx`; но вложенный layout в Next добавляется ПОВЕРХ корневого — Header/Footer корня всё равно отрендерятся. **Решение:** проверить визуально; если витринная шапка лезет в админку — вынести витрину в route-group `(public)/` с витринным layout, а `admin/` оставить с минимальным. **Сначала попробовать без переноса** (admin-layout перекрывает контент), если шапка мешает — тогда route-groups. Зафиксировать выбор по факту в step_3.
- **force-dynamic** на `/`, `/catalog`, `/catalog/[slug]` — после edit изменения видны сразу (БД-чтение). `revalidatePath` в action — на всякий случай для кэша роутера.
- **ESLint границы:** admin в `app/` импортит `@/core/catalog` (публичный API) — ОК. Внутри admin — относительные пути.
- **Витринные e2e** (39 шт) не трогать — добавляем отдельный `e2e/admin.spec.ts`.
- **Порты Postgres 5442/5443**, env через `--env-file=.env.local` в tsx; для e2e/build нужен поднятый Postgres + seed (боевые 12/30/109).

### КРИТИЧНЫЕ факты
- **PowerShell**, не bash (инлайн `VAR=val cmd` не работает; пути с `\`).
- **Node v24** на машине (EBADENGINE warning — не ошибка).
- **Next 15.5 + Turbopack**, React 19. Server actions включены по умолчанию в App Router.
- Cookie: `httpOnly`, `secure` в prod, `sameSite:'lax'`. Подпись HMAC-SHA256 от `ADMIN_SESSION_SECRET` (node:crypto). НЕ хранить пароль в cookie — хранить подписанный маркер (напр. `"ok"` + срок).
- **Один пользователь** — без таблицы users, без БД для auth вообще.

## Известные ограничения (из ревью плана 2026-05-29)
- **`updateProduct` обнуляет `reservedQty` и не сохраняет stock-резервы.** `insertVariantTree` (repository.ts) хардкодит `reservedQty: 0`; маппер `productToInput` дропает его. В Плане B вреда НЕТ (резервов нет — заказы/корзина появятся в Фазах 2/3). **Передача в Фазу 2:** перед вводом остатков/резервов `updateProduct` должен сохранять существующие `reservedQty`/`stockQty` SKU, а не затирать (иначе редактирование товара в админке сотрёт активные резервы). Сейчас НЕ чиним — фиксируем как осознанное ограничение.

## Learnings
- **Client-компоненты админки ОБЯЗАНЫ импортить из `@/core/catalog/client`, не `@/core/catalog`.** Barrel `index.ts` реэкспортит `repository.ts` → `postgres` (node:tls/net/fs) — при импорте из `'use client'` это утекает в client-бандл и **build падает** (`Module not found: Can't resolve 'tls'`). typecheck/lint НЕ ловят это — только `npm run build`. Урок: после client-компонентов всегда гонять `build`, не только typecheck. Исправлено: `ProductForm` + `product-mapper` импортят из `/client`; в `client.ts` добавлен type-only реэкспорт `ProductInput/VariantInput/SkuInput` (input-типы живут в repository.ts; `export type` стирается, postgres в граф не тянет). **Для Плана C:** create-форма/любой новый client-компонент — из `/client`.
- **`(protected)` route-group** (шаг 3): защищённые разделы в `src/app/admin/(protected)/`, login — в `src/app/admin/login/` (вне сайдбара). `admin/layout.tsx` = passthrough.
- **Submit формы — `useTransition` + проп `action(input: ProductInput)`**, не `useActionState` (форма controlled, собирает объект, а не FormData).
---
