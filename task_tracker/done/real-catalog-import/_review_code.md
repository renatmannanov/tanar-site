# Review: Code

> Дата: 2026-05-29
> Рецензент: code-reviewer agent (Claude Sonnet 4.6)

---

## Критичное (блокирует выполнение)

### 1. `zod` отсутствует в dependencies — `npm i zod` обязателен перед шагом 3

**Файл:** `package.json`

`zod` нет ни в `dependencies`, ни в `devDependencies`. Шаг 3 пишет zod-схему `productInputSchema` — без установки `npm i zod` `typecheck` и `build` упадут при первом же импорте.

Шаг 3 говорит «Добавить `zod` в зависимости (`npm i zod`)» — это правильно, но это первое действие шага 3, без которого ничего дальше не работает.

---

### 2. `scripts/check-images.ts` использует ESM (`import.meta.url`), но `tsx` запускает его без `--env-file` и без `tsconfig-paths/register`

**Файл:** `scripts/check-images.ts`, строки 1, 9; `package.json` строка `"images:check"`

Скрипт содержит `import 'tsconfig-paths/register'` вручную (строка 1), поэтому `@`-алиасы работают. Но это единственный скрипт в репо, который вручную регистрирует `tsconfig-paths` внутри файла (НЕ через `-r tsconfig-paths/register` в npm-скрипте). После удаления `seed-data.ts` импорт на строке 7 `import { products } from '../src/core/db/seed-data'` сломается с ошибкой модуля, не с ошибкой TypeScript — скрипт **упадёт в рантайме**, даже если `typecheck` пройдёт (там `skipLibCheck: true` и скрипт не в `src/`).

Шаг 5 это знает и предлагает no-op / переключить на снапшот. Важно: **проверить что `npm run images:check` не ломает CI-цепочку** до шага 5 (после шага 1 или 2 запускать его не нужно, но шаг 8 требует `images:check` зелёным).

---

### 3. Миграция к test-БД: `drizzle.config.ts` читает `DATABASE_URL` через `dotenv.config({ path: '.env.local' })`, инлайн-env имеет приоритет — но команда в шаге 1 сформулирована некорректно

**Файлы:** `drizzle.config.ts`, `step_1_schema_fields.md` (строки 29-30)

Шаг 1 предлагает:
```
DATABASE_URL="<test-url>" npx drizzle-kit migrate
```
На Windows PowerShell это **не работает** (нет inline env-prefix). Правильная форма — как зафиксировано в `task_tracker/done/phase-0-foundation/progress.md` строка 73:
```powershell
$env:DATABASE_URL = "<test-url из .env.local>"; npx drizzle-kit migrate
```
или через dotenv-приоритет:
```
DATABASE_URL="..." npx drizzle-kit migrate   # только bash
```
На Windows нужен `$env:DATABASE_URL = "..."; npx drizzle-kit migrate` (либо `set DATABASE_URL=... && npx drizzle-kit migrate` в cmd). Это блокирует шаг 1 на Windows-машине разработчика (машина Windows 11, PowerShell).

---

## Важное (стоит исправить до начала)

### 4. `catalog.spec.ts`: список чипов в тесте содержит `'Куртки'` дважды по факту — тест пройдёт, но семантически неверен

**Файл:** `e2e/catalog.spec.ts`, строка 12

Текущий список: `['Все', 'Куртки', 'Худи', 'Футболки', 'Штаны', 'Шорты']`.
Шаг 7 меняет на: `['Все', 'Куртки', 'Брюки', 'Шорты', 'Футболки', 'Поло']`.

Это корректно. Но шаг 7 также упоминает что `CATEGORY_ORDER` в новом порядке будет `jackets, pants, shorts, tshirts, polo` — а ярлык `'Куртки'` проверяется `exact: true`. Всё совпадёт, но стоит проверить порядок в `CATEGORIES` из шага 2 ровно с тем, что написано в тесте (там порядок `Все/Куртки/Брюки/Шорты/Футболки/Поло` — это то же, что задан в `CATEGORIES` массиве шага 2). Расхождений нет — просто убедиться что `CATEGORY_ORDER` строится из массива в том же порядке (код в `categories.ts` строка 12 это гарантирует: `CATEGORIES.map((c) => c.id)`).

---

### 5. `seed.ts` импортирует `productImagePath` из `@/core/catalog` — после замены seed.ts этот импорт уйдёт, но текущий файл сохраняет медиа-ассеты

**Файл:** `src/core/db/seed.ts`, строка 5 (`import { productImagePath } from '@/core/catalog'`)

Текущий `seed.ts` вставляет строки в `media_assets` (функция `buildMediaRows`). Новый импорт-скрипт (шаг 5, PLAN.md: «MediaAsset для боевых товаров в Плане A НЕ создаём»)  **не вставляет медиа-ассеты**. Это корректно по плану, но:

- `TRUNCATE ... media_assets ... CASCADE` в новом скрипте всё равно нужен (что план и предусматривает в шаге 5 строка 2).
- Таблица `media_assets` останется пустой после импорта — это намеренно (фото нет).
- `reset.ts` тоже делает TRUNCATE media_assets — ок, оставляем.

Нет проблемы, просто убедиться что новый скрипт не забудет включить `media_assets` в TRUNCATE (он может опустить его, оставив старые записи от предыдущего seed).

---

### 6. `mapProduct` и `mapSku` в `repository.ts` не читают новые поля `label`/`care`/`article`/`ruSize` — шаг 3 должен их добавить, но step_3 про это говорит кратко

**Файл:** `src/core/catalog/repository.ts`, строки 16-24 (`mapSku`), 26-39 (`mapProduct`)

Текущий `mapSku` возвращает `{ id, size, priceOverride, stockQty, reservedQty }`. После шага 1 в БД появятся `article` и `ru_size`, но read-методы их **не вернут**, пока `mapSku` не добавит `article: row.article ?? undefined` и `ruSize: row.ruSize ?? undefined`.

Аналогично `mapProduct`: нет `label` и `care`.

Шаг 3 упоминает это («Mapper'ы чтения дополнить новыми полями» — критерий готовности), но фактическая реализация выглядит просто: mapper работает через `typeof schema.products.$inferSelect` → after step 1 там появятся поля автоматически. Нужно только дописать поля в return-объект. Это не забытая задача, но стоит убедиться, что шаг 3 не пропустит маппер — он не часть «write-контракта», но упоминается вскользь.

---

### 7. `ProductCard.tsx` вызывает `getProductCardImage` — передаёт `defaultVariant.models[0]` — для боевых товаров `models: []` (план: `models: []` для всех вариантов в импорте)

**Файл:** `src/components/ProductCard.tsx`, строка 10; `step_5_import_script.md` строка маппинга: `models: []`

Если `models` — пустой массив, `models[0]` === `undefined`, тогда `getProductCardImage(slug, colorId, undefined)` вернёт путь `.../front-undefined-card-md.webp`. Но строка 12 проверяет `const showImage = cardImage && !isComingSoon` — `cardImage` будет объектом (не null), потому что `getProductCardImage` возвращает объект всегда (строки 11-14 `images.ts`). Значит `showImage = true`, и Next.js `<Image>` попытается загрузить `front-undefined-card-md.webp` — файл не найдёт, 404 в браузере.

Ситуация: боевые товары, `models: []`, нет фото → **рендер должен использовать градиент** (Placeholder). Но код проверяет не пустоту models, а наличие cardImage. Нужно либо проверять `models.length > 0` перед `getProductCardImage`, либо `getProductCardImage` возвращать `null` если `model === undefined`.

**Это существующий баг для товаров без фото** — он был и в демо (там `models: ['man', 'girl']`, всегда ≥1), но с боевым каталогом (все `models: []`) он станет видимым: карточки покажут сломанные img вместо градиентов.

Шаг 6 (проверка глазами) должен поймать это при дев-запуске, но в план явно не включено.

---

### 8. `catalog.spec.ts` тест «all filter chips» не содержит `'Куртки'` в текущем списке — ошибка в шаге 7

**Файл:** `e2e/catalog.spec.ts`, строка 12 (текущий код); `step_7_e2e.md` строка 12

`step_7_e2e.md` говорит: «`['Все', 'Худи', 'Футболки', 'Штаны', 'Шорты']` → `['Все', 'Куртки', 'Брюки', 'Шорты', 'Футболки', 'Поло']`». Но в реальном файле `e2e/catalog.spec.ts` строка 12 уже содержит `'Куртки'`:
```
['Все', 'Куртки', 'Худи', 'Футболки', 'Штаны', 'Шорты']
```
Значит шаг 7 должен менять список начиная с `'Куртки'` (а не добавлять `'Куртки'` как подразумевает формулировка «→»). Несущественно, но агент может запутаться при выполнении и потерять `'Куртки'` из нового списка.

---

## Мелочи (можно по ходу)

### 9. `engines` в package.json: `"node": ">=20 <21"`, но на машине Node v24

**Файл:** `package.json` строка 24; `progress.md` из фазы 0

Реальность: Node v24.11.1, engines ограничивает `<21`. Работает (EBADENGINE — warning, не ошибка). План это знает (progress.md строка 74). Поскольку менять engines не в объёме плана — игнорируем.

---

### 10. `drizzle-kit migrate` применяет миграции к одной БД (из `drizzle.config.ts`) — нет готовой команды для test-БД в npm-скриптах

**Файл:** `package.json`, `drizzle.config.ts`

Нет скрипта `db:migrate:test`. Для test-БД каждый раз нужен inline `$env:DATABASE_URL`. Шаг 1 это описывает верно. Нет необходимости заводить отдельный скрипт в этом плане, но стоит зафиксировать в progress.md для будущих планов.

---

### 11. `reset.ts` содержит хардкод таблиц в TRUNCATE — не включает новые таблицы, но план их не добавляет

**Файл:** `src/core/db/reset.ts` строка 13

TRUNCATE включает все 7 таблиц: `products, product_variants, skus, media_assets, orders, order_items, inventory_log`. В шаге 1 новых таблиц не появляется (только новые колонки) — `reset.ts` трогать не нужно. PLAN.md это подтверждает («НЕ менять reset.ts»).

---

### 12. Снапшот хранит `"marketplace"` (не `"marketplaces"`) на уровне продукта — маппинг в шаге 5 должен использовать правильное поле

**Файл:** `task_tracker/todo/real-catalog-import/catalog-snapshot.json`, строка ~39; `step_5_import_script.md` строка 22

В снапшоте: `"marketplace": { "ozonGroupId": ..., "priceOzon": ... }` (ед. ч., без `s`). Шаг 5 говорит «НЕ из snapshot.marketplace!» — это верно. Но код маппинга должен явно написать `marketplaces: {}` или `marketplaces: undefined`, игнорируя `p.marketplace`. Если агент случайно напишет `marketplaces: p.marketplaces` (мн. ч., как в доменном типе) — получит `undefined`, что нормально. Если напишет `p.marketplace` — ozon-поля попадут в core. Просто осторожность.

---

## Не найдено проблем

- **`resolveJsonModule: true`** в `tsconfig.json` — есть. JSON-импорты через `import` из `src/` допустимы TypeScript'ом. Однако шаг 5 справедливо предлагает `fs.readFileSync` + `JSON.parse` для tsx-скрипта (путь к снапшоту выходит за пределы `src/` — лежит в `task_tracker/`). При import из-за пределов `src/` `@`-alias не работает, нужен относительный путь `'../../../task_tracker/...'` — с tsx это работает, но `fs.readFileSync(path.resolve(...))` надёжнее и план это правильно зафиксировал.
- **ESLint-правила** (`eslint.config.mjs`) — `no-restricted-imports` для `@/core/*/*` и `@/marketplace/*` настроены корректно. Новые файлы (`repository.ts` write-методы, `media/index.ts`) попадают под те же правила — никаких дополнительных изменений ESLint не требуется.
- **`db.transaction`** — подтверждено по typings (`node_modules/drizzle-orm/postgres-js/session.d.ts`). `PostgresJsTransaction` поддерживается в drizzle-orm 0.45.2.
- **`db.$count`** — подтверждено по typings (`pg-core/db.d.ts`). Используется в текущем `seed.ts`, работает.
- **`force-dynamic`** на `/`, `/catalog`, `/catalog/[slug]` — уже проставлено в коде (`src/app/catalog/page.tsx` строка 6, `src/app/catalog/[slug]/page.tsx` строка 13). План не ошибается.
- **Docker-контейнер** для dev называется `tanar-site-postgres-dev-1` — именно это имя указано в командах верификации шага 1. Совпадает с именем из `docker compose up -d` (проект `tanar-site`, сервис `postgres-dev`).
- **`seed.ts` (текущий) использует `import { db, queryClient }` из `./client`**, а не из `@/core/db` — это корректно для файла внутри `src/core/db/` (относительный путь, не нарушение границ).
- **Тип `ProductStatus`** (`draft | published | archived | coming_soon`) экспортируется из `@/core/contracts` и переэкспортируется через `types.ts`. `ProductInput` в шаге 3 типизирует `status?: ProductStatus` — импорт через `./types` (relative) валиден внутри catalog-модуля.
- **Импорт `from '@/core/contracts'` в `core/media/index.ts`** (шаг 4) — корректен, не нарушает ESLint (`@/core/contracts` — это `@/core/contracts`, а не `@/core/contracts/*`).
