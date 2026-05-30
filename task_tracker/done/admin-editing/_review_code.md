# Review: Code

> Записано основным агентом (суб-агент code-reviewer дважды упал с API 500). Находки подтверждены чтением реального кода и типов установленного Next 15.5.15.

## Критичное (блокирует выполнение)

### 1. `cookies()` в Next 15 — асинхронный, план зовёт его без `await` [CONFIRMED]
**step_1** (`loginAction`/`logoutAction`), **step_2/step_3** (`requireAdmin`, чтение cookie в layout).
Проверено в типах установленного пакета: `node_modules/next/dist/server/request/cookies.d.ts:24` →
```ts
export declare function cookies(): Promise<ReadonlyRequestCookies>;
```
План пишет `cookies().set(ADMIN_COOKIE, ...)`, `cookies().delete(...)`, `cookies().get(...)` **без await**. В Next 15 это вернёт Promise, а не cookie-store → `.set`/`.get` на Promise = ошибка типов (typecheck упадёт) либо рантайм-баг.
→ Зафиксировать во всех затронутых местах: `const store = await cookies(); store.set(...)`. Все функции, читающие/пишущие cookie (`loginAction`, `logoutAction`, `requireAdmin`, `verifySessionToken`-вызыватели), должны быть `async` и `await cookies()`. То же для `headers()` если используется.

### 2. Маппинг Product→ProductInput: slug в `productColumns` перезапишет идентификатор [CONFIRMED]
**step_5/step_6.** Подтверждено `repository.ts`: `updateProduct(slug, input)` зовёт `productColumns(parsed)`, а `productColumns` включает `slug: input.slug` → `UPDATE products SET slug = input.slug`. Если форма (поле slug readonly, но `input.slug` всё равно уходит) или баг передаст изменённый slug — товар «переедет», старые URL → 404.
→ В `updateProductAction` использовать ТОЛЬКО routeSlug: либо перед вызовом `input.slug = routeSlug`, либо в `updateProduct` игнорировать смену slug. Зафиксировать в step_6 однозначно (сейчас защиты нет).

## Важное (стоит исправить до начала)

### 3. Имена полей маппера — реально различаются, маппер обязателен (план прав, но проверь точность) [CONFIRMED]
Подтверждено `types.ts`: read-тип `Product.price` (НЕ priceBase), `ProductColor.id`/`.label` (НЕ colorId/colorLabel), `Sku` имеет `id`+`reservedQty`. Write-тип `ProductInput.priceBase`, `VariantInput.colorId/colorLabel`, `SkuInput` без id/reservedQty. План это закладывает в `productToInput` (step_5) — корректно. Замечание: маппер должен дропнуть `Sku.id` и `Sku.reservedQty` и переименовать price→priceBase, id→colorId, label→colorLabel. Это ровно то, что в step_5 — ок, но критерий «маппер компилируется» (typecheck) поймает ошибку только если типы строгие; добавить мысленную проверку round-trip на jacket-sv7-goretex.

### 4. `@radix-ui/*` отсутствуют в package.json — ставятся в step_3 [CONFIRMED]
Проверено: в `package.json` нет radix. step_3 ставит `@radix-ui/react-dialog`, `@radix-ui/react-label` — корректно. Замечание: версии под React 19 — radix совместим с React 19, но при установке возможен peer-warning (не ошибка). Не блокер.

### 5. `revalidatePath('/catalog/[slug]')` vs конкретный путь [CONFIRMED-minor]
**step_6.** Витрина `/catalog/[slug]` — `force-dynamic` (читает БД каждый запрос), поэтому изменения видны и без revalidate. `revalidatePath` в action избыточен, но безвреден. Оставить как есть (страховка для router cache). Не проблема, отмечено для ясности.

## Мелочи (можно по ходу)

- **step_1** `secure: production` — псевдокод, реально `secure: process.env.NODE_ENV === 'production'`. Редакционное.
- **playwright webServer env**: e2e полагается на `.env.local` (где ADMIN_PASSWORD/SECRET). Проверить, что `playwright.config` поднимает dev/start с подхватом `.env.local` (next сам читает .env.local) — для `next start` переменные тоже нужны в окружении. step_7 это отмечает; достаточно.
- **middleware + node:crypto**: step_2 фиксирует Node-runtime middleware — корректно для переиспользования `verifySessionToken`. Edge-runtime по умолчанию не имеет полного `node:crypto`; решение плана верное.

## Не найдено проблем
- ESLint-границы: admin в `app/` → `@/core/catalog` (публичный API) — разрешено `eslint.config.mjs`. OK.
- Сигнатуры `createProduct/updateProduct/deleteProduct` существуют и экспортируются из `@/core/catalog` — подтверждено. OK.
- `getAllProducts`/`getProductBySlug` существуют, отдают доменный `Product` — OK для списка и edit-страницы.
- `MediaStore`/`MediaAsset` — только контракт в `@/core/media`, реализации нет → фото-слот disabled корректен. OK.
