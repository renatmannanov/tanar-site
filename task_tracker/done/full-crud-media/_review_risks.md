# Review: Risks

> Дата: 2026-06-01
> Ревьюер: risk analyst agent
> База: PLAN.md + step_1–8 + progress.md + код в src/

---

## Критичное (только [CONFIRMED] и [LIKELY])

### 1. Шаг 1 — upsert варианта при смене colorId создаёт сиротскую media — [CONFIRMED]

**Файл:** `task_tracker/todo/full-crud-media/step_1_update_product_upsert.md`, строка 15-16.
**Файл кода:** `src/core/db/schema.ts`, строки 114-117 — `media_assets.variantId` → `onDelete: cascade`.

В шаге 1 описан diff по `colorId`: «если colorId существует → UPDATE; иначе INSERT нового». Проблема в другом краю: исчезнувшие варианты → DELETE по `colorId`. Каскад в БД (`onDelete: cascade` на `variantId`) снесёт строки `media_assets` — это верно и задокументировано. Но **файлы** в `public/images/products/<slug>/` остаются (каскад их не трогает). В шаге 4 это явно зафиксировано как orphan-files при deleteProduct, но шаг 1 об этом **молчит**. Если пользователь:
1. Загрузит фото к варианту (шаги 2/5)
2. Удалит этот цвет из формы и сохранит (updateProduct → DELETE варианта → каскад DB)
3. ...файлы останутся навсегда

Для шага 1 это не блокер (шаги 2/5 ещё не готовы), но логика должна быть согласована с шагом 4, где orphan-files уже зафиксированы. **Риск:** агент-исполнитель может не заметить несоответствие и не добавить запись в progress.md.

---

### 2. Шаг 3 — `createProductAction` не форсирует slug, в отличие от `updateProductAction` — [CONFIRMED]

**Файл:** `task_tracker/todo/full-crud-media/step_3_admin_create.md`, строки 12-14.
**Файл кода:** `src/app/admin/(protected)/catalog/actions.ts`, строки 17-29 — `updateProductAction` принудительно заменяет `input.slug` на `slug` из маршрута.

В шаге 3 написано: `await createProduct(input)` — slug берётся из `input`. Это корректно для create. Но после создания action делает `redirect('/admin/catalog/' + input.slug + '/edit')`. Если `input.slug` содержит пробелы, заглавные буквы, или спецсимволы (валидация zod только `min(1)`) — URL сломается или Zod-ошибка будет показана не явно. Существующий `productInputSchema` (`src/core/catalog/repository.ts`, строка 200) принимает любую `z.string().min(1)` без slug-санитизации. **Риск:** неочевидная ошибка при create с «плохим» slug; редирект уйдёт на несуществующий URL. Шаг 3 не требует slug-валидации на стороне action — формула «Zod внутри, catch → {error}» её не покрывает.

---

### 3. Шаг 5 — `@/core/media` тянет ли что-то server-only в client bundle? — [CONFIRMED]

**Файл:** `task_tracker/todo/full-crud-media/step_5_photo_block.md`, строки 39.
**Файл кода:** `src/core/media/index.ts` — сейчас только типы, без `node:fs`/sharp. **Но** шаг 2 добавляет `store.ts` с `node:fs` и sharp и реэкспортирует из `index.ts`. Шаг 5 явно предупреждает: «проверить, что `@/core/media` index НЕ тянет `node:fs`/sharp — если тянет, вынести client-safe типы в `@/core/media/client`». **Риск:** если агент-исполнитель реэкспортирует `store.ts` из `index.ts` без разделения, `VariantPhotos` (client-компонент) импортирующий типы из `@/core/media` сломает build (`Can't resolve 'node:fs'`). Аналог грабли из Плана B (описано в progress.md строка 32). typecheck/lint этого не поймают — только `npm run build`. В шаге 5 это описано, но формулировка «или вынести» оставляет двусмысленность: агент может решить что `store.ts` не реэкспортируется — и ошибиться.

---

## Важное (только [CONFIRMED] и [LIKELY])

### 4. Шаг 2 — HEIC через sharp на Windows требует libvips с heif-поддержкой — [LIKELY]

**Файл:** `task_tracker/todo/full-crud-media/step_2_media_store.md`, строка 21. `progress.md`, строка 42 («sharp — добавить в deps, на Windows ставится с prebuilt-бинарём»).
**Факт:** `sharp` уже в `devDependencies` (`package.json`, строка 52 — `"sharp": "^0.34.5"`). Prebuilt-бинари sharp для Windows включают libvips, но **HEIC/HEIF** требует `heif` decoder, который не всегда включён в prebuilt. Шаг 2 принимает HEIC как входной формат (`rotate()` учесть EXIF). **Риск:** `sharp(buf).rotate()` на HEIC-файле бросит `Input file contains unsupported image format` на Windows. Ни typecheck, ни lint это не покажут — только ручной тест с реальным HEIC. Сценарий: заказчица снимает на iPhone (HEIC по умолчанию) → upload падает с непонятной ошибкой. **Рекомендация:** либо убрать HEIC из заявленных форматов, либо добавить проверку и явное сообщение об ошибке.

---

### 5. Шаг 7 — `afterAll: db:seed` перезаписывает данные загруженных фото, файлы остаются — [CONFIRMED]

**Файл:** `task_tracker/todo/full-crud-media/step_7_e2e.md`, строки 25-26.
**Файл кода:** `e2e/admin.spec.ts`, строки 24-26 — существующий `afterAll` уже делает `execSync('npm run db:seed')`.

Новый spec также должен делать `db:seed + удалить тестовые файлы из public/`. Проблема: `db:seed` делает truncate всех таблиц и пересев (исходя из progress.md строки 42 о seed). Если запускается `admin.spec.ts` и `admin-crud-media.spec.ts` в одном прогоне Playwright (параллельно или последовательно), `afterAll` одного spec может запуститься во время работы другого, т.к. Playwright запускает файлы параллельно по умолчанию. **Риск:** гонка — `db:seed` одного spec сносит данные, созданные тестом другого. **Дополнительно:** если `afterAll` падает до удаления файлов, `public/images/products/e2e-test-product/` остаётся в репо при `git add -A`. Шаг 7 упоминает очистку файлов, но не упоминает Playwright `workers` конфигурацию.

---

### 6. Шаг 3 — существующий e2e-тест проверяет, что кнопка «Создать товар» `disabled` — [CONFIRMED]

**Файл кода:** `e2e/admin.spec.ts`, строка 48: `await expect(page.getByRole('button', { name: 'Создать товар' })).toBeDisabled()`.

Шаг 3 активирует кнопку. Этот тест сломается сразу после шага 3 и останется красным до шага 7. Шаг 3 не упоминает, что нужно обновить `admin.spec.ts`. **Риск:** если агент-исполнитель прогонит `test:e2e` после шага 3 (что требуют критерии готовности) — тест упадёт. Нужно либо обновить `admin.spec.ts`, либо убрать проверку. Шаг 7 занимается только новым spec-файлом.

---

### 7. Шаг 1 — `skuInputSchema` не имеет `reservedQty`, UPDATE SKU не трогает его — [CONFIRMED]

**Файл кода:** `src/core/catalog/repository.ts`, строки 180-188 — `skuInputSchema` не содержит `reservedQty`. `insertVariantTree` хардкодит `reservedQty: 0` (строка 252). При upsert план говорит: «UPDATE существующего SKU не включает `reservedQty` в set». Это правильно. Но: если агент-исполнитель реализует upsert через Drizzle `onConflictDoUpdate`, нужно явно исключить `reservedQty` из `set` — иначе `set: sku` спреднёт все колонки включая `reservedQty: 0` из `skuInputSchema`. Шаг 1 формулирует это правило (строка 27), но не даёт конкретного кода — риск ошибки реализации. Последствие: `reservedQty` обнуляется при каждом сохранении, что ломает инвентаризацию Фазы 2.

---

### 8. Шаг 4 — `deleteProductAction` в `actions.ts` конфликтует по редиректу с `updateProductAction` — [LIKELY]

**Файл кода:** `src/app/admin/(protected)/catalog/actions.ts`, строка 31: `redirect('/admin/catalog')`. `updateProductAction` тоже делает `redirect('/admin/catalog')`. Шаг 4 добавляет `deleteProductAction` в тот же файл. Если оба action будут в одном файле, это нормально. Но шаг 4 также описывает передачу `deleteAction` через проп `ProductForm` — форма уже имеет проп `action: (input: ProductInput) => Promise<{error?}>`, а `deleteAction` имеет другую сигнатуру `() => Promise<{error?}>`. **Риск:** агент-исполнитель может перепутать сигнатуры или добавить лишний параметр к `ProductForm.Props`, сломав TypeScript. Шаг 4 описывает несколько вариантов («либо», «простейшее») — двусмысленность.

---

## Мелочи ([THEORETICAL])

### T1. Шаг 2 — `sortOrder = max(existing) + 1` в конкурентной среде — [THEORETICAL]

При параллельной загрузке двух фото одновременно оба могут прочитать одинаковый `max(sortOrder)` → duplicate sortOrder. Маловероятно в однопользовательской админке, нет уникального constraint на `(variantId, sortOrder)`. Практически не блокер.

### T2. Шаг 6 — srcset по конвенции `-1600`→`-800` ломается, если URL содержит цифры — [THEORETICAL]

`url.replace('-1600', '-800')` сломается если slug или uuid содержит `-1600`. UUID v4 такого не генерирует, slug — вручную контролируется. Теоретически, без подтверждения в коде.

### T3. Шаг 5 — `router.refresh()` после upload может вызвать мерцание UI — [THEORETICAL]

`router.refresh()` перемонтирует server-компоненты. В зависимости от скорости соединения превью может «мигнуть». Без UX-последствий для MVP.

---

## Не найдено проблем

- Граница модулей (`@/core/catalog/client` vs `@/core/catalog`) — план явно знает об этом и повторяет правило в progress.md и в шаге 5.
- `redirect()` вне try/catch — во всех шагах (3, 4) явно указано, паттерн совпадает с существующим `updateProductAction`.
- `requireAdmin()` первой строкой — все media-actions в шаге 5 имеют явную инструкцию.
- `createProduct` не затронут upsert-логикой — шаг 1 это зафиксировал.
- `media_assets` схема уже существует, миграция не нужна — подтверждено в `schema.ts` строки 103-133.
- `sharp` уже в devDependencies — `package.json` строка 52.
