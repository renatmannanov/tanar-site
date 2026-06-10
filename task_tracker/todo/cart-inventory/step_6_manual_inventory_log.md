# Шаг 6: inventory_log(manual) при ручной правке остатка

> Зависит от: шаги 1 (logManualAdjustments) И 2 (§5 шага 2 правит тот же
> `repository.ts` — upsertSkus/deleteProduct; параллельный запуск перетрёт правки)
> Статус: [ ] pending

## Задача

`src/core/catalog/repository.ts`, функция `upsertSkus` (ветка UPDATE):

- В существующий SELECT существующих SKU добавить `stockQty: schema.skus.stockQty`.
- При UPDATE существующего SKU: если `newStock !== oldStock` — накопить запись
  `{ skuId: id, delta: newStock - oldStock, note: 'admin product form' }`.
- После цикла — один вызов `logManualAdjustments(tx, entries)` (импорт из
  `@/core/inventory` — server-код, core→core через index разрешён).
- INSERT новых SKU и НАЧАЛЬНОЕ заполнение (createProduct/insertSkus) — НЕ
  журналировать (иначе сид нагенерит 109 строк шума). Журналируются только
  изменения через updateProduct. Зафиксировать это комментарием у insertSkus.
- DELETE исчезнувшего размера и `deleteProduct` — НЕ журналировать; FK-чистка
  inventory_log при удалении SKU/товара уже сделана шагом 2 (§5) — не дублировать.

## Тесты

e2e-UI не меняется. Верификация — SQL до/после правки остатка через админку
(вручную или мини-ассертом в e2e шага 3 после изменения stockQty 1→0):

```bash
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c \
  "SELECT reason, delta, note FROM inventory_log ORDER BY created_at DESC LIMIT 5;"
```

После правки остатка в форме товара (например 1→0) появляется строка
`manual, -1, admin product form`.

Существующие admin-спеки (admin.spec edit-save, admin-crud-media, storefront-completion)
много раз сохраняют товары НЕ меняя сток — лог не должен пухнуть (delta=0 не пишем).

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin.spec.ts e2e/admin-crud-media.spec.ts
# SQL-проверка выше: count(inventory_log reason=manual) растёт ТОЛЬКО при изменении стока
npm run test:e2e
```

## Критерии готовности

- [ ] Правка остатка в форме → строка inventory_log reason=manual с верной delta (SQL)
- [ ] Сохранение товара без изменения остатка не пишет в лог (SQL: счётчик не вырос)
- [ ] Удаление товара/размера с историей лога не падает (admin-crud-media зелёный)
- [ ] typecheck, lint, build, test:e2e — exit 0
