# Real Catalog Import + CRUD Foundation (План A)

> Статус: pending
> Дата: 2026-05-29
> Тип: фича + фундаментальный рефакторинг (write-слой каталога)

## Цель

Завести **боевой каталог TANAR** (12 товаров / 30 вариантов / 109 SKU из выверенного `catalog-snapshot.json`) вместо демо-фикстуры, расширив схему под реальные поля (label, care, article, ruSize) и новые категории (jackets/pants/shorts/tshirts/polo). Параллельно — заложить **полный write-контракт** `core/catalog` (create/update/delete с транзакциями и zod-валидацией), который обкатывается импорт-скриптом как первым потребителем. Это фундамент под Планы B (админка-редактирование) и C (полный CRUD + фото) — без переделки.

Витрина внешне продолжает работать (force-dynamic уже есть), но показывает боевой каталог. E2E переписываются под новые данные.

## Контекст (читать перед стартом)

- `task_tracker/todo/real-catalog-import/catalog-snapshot.json` — **источник правды** (12/30/109, выверен). Сырой CSV (`internal/docs/...csv`, gitignored) больше не открываем.
- `task_tracker/backlog/real-catalog-import.md` — секции «Порядок поставки» и «Решения».
- `ARCHITECTURE-ecommerce.md` — блок «Решения по Фазе 1», модель данных.
- `task_tracker/done/phase-0-foundation/progress.md` — паттерны seed (env, tsx, guard).
- `progress.md` (в этой папке) — находки исследования кода: что меняем, что сломается.

## Архитектурные решения (зафиксированы, без альтернатив)

- **Категории:** `ProductCategory = 'jackets' | 'pants' | 'shorts' | 'tshirts' | 'polo'`. Ярлыки: Куртки / Брюки / Шорты / Футболки / Поло. Старые `hoodies`, `t-shirts` удаляются (id `t-shirts` → `tshirts`, дефис убираем — чище для URL/типов).
- **label:** `products.label` — jsonb `{ badge: string; sub: string } | null`. badge = первая строка бирки (GORE-TEX®), sub = вторая (Куртка Gore-Tex).
- **care:** `products.care` — text nullable.
- **article:** `skus.article` — text nullable (внутренний артикул TANAR-001).
- **ruSize:** `skus.ru_size` — text nullable (рос. размер «46»).
- **Цена:** `priceBase` = priceBase из снапшота (= Kaspi). priceOverride на SKU не используем при импорте.
- **Остатки:** `stockQty` = sku.stock из снапшота как есть. `stockUnknown:true` уже отражён в снапшоте как `stock:0`.
- **Ozon-поля** (`marketplace.ozonGroupId/priceOzon/ozonSku`) **НЕ грузим в core** — снапшот их хранит для Фазы 5.
- **Write-контракт:** `createProduct/updateProduct/deleteProduct` в `repository.ts` — единственный путь записи. Импорт-скрипт зовёт `createProduct`, НЕ сырые insert. Транзакции (product+variants+skus атомарно), zod-валидация входа.
- **media:** `core/media/index.ts` — только типы/пустые порты-заглушки (контракт). Реальная загрузка — План C.
- **seed → import:** `db/seed.ts` заменяется импорт-скриптом из `catalog-snapshot.json`. `seed-data.ts` удаляется. npm-скрипт `db:seed` остаётся именем (указывает на новый импорт), чтобы build/e2e-предусловие не менять.
- **public/images/ НЕ трогаем** (файлы демо-фото остаются, как просил заказчик). MediaAsset для боевых товаров в Плане A НЕ создаём (фото нет) — товары рендерятся на градиентах.

## Шаги

| # | Файл | Статус |
|---|------|--------|
| 1 | step_1_schema_fields.md — схема Drizzle: products.label/care, skus.article/ru_size + миграция | [x] |
| 2 | step_2_categories.md — новые категории в contracts + catalog/categories + типы Product/Sku + Footer/CategoriesGrid | [x] |
| 3 | step_3_crud_contract.md — полный write-контракт repository (create/update/delete, zod, транзакции) | [x] |
| 4 | step_4_media_contract.md — заготовка контракта core/media (типы, пустые порты) | [x] |
| 5 | step_5_import_script.md — импорт-скрипт из catalog-snapshot.json через createProduct; удалить seed-data | [x] |
| 6 | step_6_storefront_consumers.md — витрина: gradient-fallback при пустых models (крит!) + catalog metadata | [ ] |
| 7 | step_7_e2e.md — переписать e2e под боевой каталог (чипы, slugs, счётчики) | [ ] |
| 8 | step_8_completion.md — завершение плана | [ ] |

## Критерии готовности

- [ ] `npm run db:migrate` применяет новую миграцию к dev-БД без ошибок
- [ ] `npm run db:seed` (импорт) печатает `import OK: {...}` с числами products=12, variants=30, skus=109 (вычислены из снапшота, не хардкод)
- [ ] В БД: `SELECT count(*)` products=12, product_variants=30, skus=109
- [ ] `npm run typecheck` — без ошибок
- [ ] `npm run lint` — без ошибок (границы модулей соблюдены)
- [ ] `npm run build` — проходит
- [ ] `npm run test:e2e` — все зелёные (переписаны под боевой каталог)
- [ ] Витрина показывает боевые товары на **градиентах** (Placeholder), без битых `<Image>` / 404 на `*-undefined-*.webp`
- [ ] `src/core/db/seed-data.ts` отсутствует
- [ ] Grep `hoodies` и `t-shirts` по `src/` — 0 совпадений
- [ ] `core/catalog` экспортирует `createProduct`, `updateProduct`, `deleteProduct`
- [ ] Импорт идемпотентен: повторный `db:seed` даёт те же числа
- [ ] `public/images/` не изменён (git status чист по этой папке)
- [ ] Каждый шаг — отдельный коммит
