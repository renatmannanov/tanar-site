# Шаг 5: Импорт-скрипт из catalog-snapshot.json через createProduct

> Зависит от: шаг 3 (нужен createProduct), шаг 1 (нужны колонки)
> Статус: [ ] pending

## Задача

Заменить демо-сидер импорт-скриптом, который читает `catalog-snapshot.json` и наполняет БД боевым каталогом **через `createProduct`** (обкатка write-контракта на реальных данных). Удалить `seed-data.ts`.

### Файл
Новый `src/core/db/import-catalog.ts` (или переписать `seed.ts` под импорт — выбрать переписать `seed.ts`, чтобы npm-скрипт `db:seed` остался без изменений и предусловие build/e2e не менялось).

### Предусловие
`npm run db:up` (Postgres dev должен быть поднят; между Ralph-итерациями может быть остановлен).

### Логика
1. Тот же guard на `tanar_dev|tanar_test` (скопировать из старого seed.ts).
2. **TRUNCATE только каталожных таблиц:** `TRUNCATE products, product_variants, skus, media_assets CASCADE`. Цель — не трогать заказы напрямую, План A их не касается (правило CLAUDE.md про деструктивные операции).
   ⚠️ **Важный факт про CASCADE:** `order_items.sku_id` и `inventory_log.sku_id` ссылаются на `skus.id` (FK без onDelete). PostgreSQL `TRUNCATE skus CASCADE` **обрежет и `order_items`/`inventory_log`** (CASCADE truncate распространяется на все ссылающиеся таблицы независимо от onDelete). В Плане A они ПУСТЫ → фактического вреда нет, числа не меняются. Но если в БД появятся заказы (План 3) — этот импорт их сотрёт. Поэтому: импорт — строго dev/one-off (guard на tanar_dev/test уже защищает прод). Зафиксировать это поведение комментарием в скрипте; не пытаться «обойти» CASCADE (без него TRUNCATE skus упадёт на FK, если order_items непуст).
3. Прочитать снапшот: `import snapshot from '../../../task_tracker/todo/real-catalog-import/catalog-snapshot.json'` (относительный путь; проверить что tsx резолвит JSON-import — если нет, читать через `fs.readFileSync` + `JSON.parse`). **Решение: читать через `fs.readFileSync(path.resolve(...))` + `JSON.parse`** — надёжнее с tsx/JSON, не зависит от resolveJsonModule.
4. Маппинг snapshot → `ProductInput` (для каждого product):
   - `slug, name, category, priceBase, description` — как есть;
   - `status` — НЕ задаём (default 'published' в БД). Все боевые товары published.
   - `label` — `p.label` (объект {badge,sub}) как есть;
   - `care` — `p.care ?? undefined` (в снапшоте null у 7 товаров; zod-схема care — `.nullable().optional()`, см. step_3; в БД nullable). НЕ передавать голый `null`, если zod-поле только `.optional()`.
   - `marketplaces` — НЕ из snapshot.marketplace! (то Ozon-поля). Оставить `{}` или не передавать. **Ozon-поля (ozonGroupId/priceOzon/ozonSku) в core НЕ грузим.**
   - `variants[]`: `{ colorId, colorLabel, hex, models: [], hasFlatShots: false, skus: [...] }`;
   - `skus[]`: `{ size, ruSize, article, stockQty: sku.stock }` (stock уже 0 для unknown).
5. Для каждого `ProductInput` → `await createProduct(input)`.
6. **Self-check** (как в старом seed — числа из снапшота, не хардкод):
   - expected = `{ products: snapshot.products.length, variants: Σ variants, skus: Σ skus }`;
   - actual = `db.$count` по таблицам;
   - сравнить, throw при расхождении.
   - **Плюс точечная проверка значений** (count совпадёт даже при кривом маппинге полей — нужна проверка содержимого): после импорта прочитать `getProductBySlug('jacket-sv7-goretex')` и проверить `price === 80000` (priceBase из снапшота лёг верно) и что у него есть SKU с `article === 'TANAR-001'` (article смаппился). Throw при несовпадении. Дёшево, ловит ошибки маппинга price/article.
7. `console.log('import OK:', actual); await queryClient.end();`
8. Обернуть в `async function main(){}; main()` (tsx cjs, нет top-level await).

### Удаление демо (порядок: сначала переключить потребителя, потом удалить)
1. **Сначала** переключить `scripts/check-images.ts` с импорта `seed-data` на снапшот (см. ниже). Это потребитель ВНЕ `src/` — typecheck его не ловит, tsx упадёт в рантайме (урок Фазы 0).
2. **Потом** удалить `src/core/db/seed-data.ts`.
3. Коммит этого шага делать ПОСЛЕ того как `npm run images:check` и `npm run db:seed` зелёные — не оставлять рабочее дерево в состоянии «seed-data удалён, потребитель ещё импортит».

**`scripts/check-images.ts` — единственный зафиксированный вариант (НЕ no-op):**
- Переключить чтение источника товаров с `import { products } from '../src/core/db/seed-data'` на чтение `task_tracker/todo/real-catalog-import/catalog-snapshot.json` через `fs.readFileSync` + `JSON.parse` (тот же приём, что в импорт-скрипте).
- Логика: пройтись по товарам снапшота, собрать ожидаемые пути фото только для вариантов с `models.length > 0` (фото ожидаются). В снапшоте все `models: []` → список ожидаемых фото ПУСТ.
- При пустом списке: напечатать `images:check: no product photos yet (expected until plan C)` и `process.exit(0)`.
- НЕ удалять скрипт, НЕ делать no-op-заглушку — он остаётся рабочим и оживёт в Плане C, когда у вариантов появятся `models`/фото.
- ⚠️ Путь к снапшоту относительный от расположения скрипта — после переезда папки плана в `done/` (step_8) путь сломается; отметить это в step_8 (для check-images источник можно будет переключить на БД или на новый путь снапшота).

### npm-скрипт
`db:seed` оставить именем, путь → новый/переписанный файл. Если файл назван `import-catalog.ts`:
`"db:seed": "tsx --env-file=.env.local -r tsconfig-paths/register src/core/db/import-catalog.ts"`.
(Если переписали seed.ts — путь не меняется.)

## Тесты
- Self-check в самом скрипте = проверка соответствия БД снапшоту.
- e2e — в шаге 7 (после обновления витрины в шаге 6).

## Команды для верификации

```powershell
npm run db:up                # postgres поднят
npm run db:seed              # import OK: { products: 12, variants: 30, skus: 109 }
```

Проверка чисел в БД:
```powershell
docker exec tanar-site-postgres-dev-1 psql -U postgres -d tanar_dev -c "SELECT (SELECT count(*) FROM products) p, (SELECT count(*) FROM product_variants) v, (SELECT count(*) FROM skus) s;"
```
Ожидаем p=12, v=30, s=109.

Идемпотентность:
```powershell
npm run db:seed              # второй прогон → те же 12/30/109
```

check-images:
```powershell
npm run images:check         # не падает (переключён на снапшот / no-op)
```

Grep: `seed-data` по всему репо → 0 (кроме истории task_tracker).

## Критерии готовности

- [ ] Импорт-скрипт читает catalog-snapshot.json через fs+JSON.parse
- [ ] Наполняет БД через `createProduct` (не сырые insert)
- [ ] Ozon-поля НЕ попадают в core (marketplaces пустой)
- [ ] `npm run db:seed` печатает `import OK` с 12/30/109 (вычислено из снапшота)
- [ ] БД: products=12, variants=30, skus=109
- [ ] Повторный прогон идемпотентен (те же числа)
- [ ] `seed-data.ts` удалён
- [ ] `scripts/check-images.ts` не падает (переключён на снапшот/no-op)
- [ ] `npm run images:check` зелёный
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(db): import real catalog from snapshot via createProduct; drop demo seed-data`
