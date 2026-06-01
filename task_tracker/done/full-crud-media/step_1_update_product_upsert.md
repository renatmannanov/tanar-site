# Шаг 1: updateProduct → upsert (сохранить variantId + reservedQty)

> Зависит от: нет
> Статус: [x] done

## Задача

Переписать `updateProduct` в `src/core/catalog/repository.ts` с «снести дерево вариантов и вставить заново» на **upsert по стабильному ключу**, чтобы сохранять `variantId` (иначе каскад `media_assets` уничтожит фото при каждом сохранении формы) и `reservedQty`/`stockQty` существующих SKU.

### Новая логика `updateProduct(slug, input)` (внутри транзакции)
1. Найти товар по slug (как сейчас, throw если нет). UPDATE product-колонок (`productColumns`) — без изменений.
2. **Варианты** — diff по `colorId` (unique `product_variants(product_id, color_id)`):
   - Загрузить существующие варианты товара (`id, colorId`).
   - Для каждого варианта из `input`: если `colorId` существует → UPDATE (`colorLabel/hex/models/hasFlatShots`), сохранить его `id`; иначе INSERT, получить новый `id`.
   - Варианты, чей `colorId` исчез из input → DELETE (каскад снесёт их skus и media — это корректно: цвет удалён осознанно).
3. **SKU внутри каждого (сохранённого/нового) варианта** — diff по `size` (unique `skus(variant_id, size)`):
   - Существующий `size` → UPDATE (`ruSize/article/priceOverride/stockQty`). **`reservedQty` НЕ трогать** (не передаём в set).
   - Новый `size` → INSERT (`reservedQty: 0`).
   - Исчезнувший `size` → DELETE.
4. Вернуть `getProductBySlug(parsed.slug)`.

> `createProduct` НЕ меняем — он вставляет с нуля (нет существующих вариантов). `insertVariantTree` остаётся для create; для update — новая diff-логика (можно вынести хелпер `upsertVariantTree`).

> **ЗАПРЕТ (зафиксировано):** НЕ использовать `onConflictDoUpdate` для SKU — он требует перечислить `set`-колонки, и легко спреднуть туда `reservedQty`, обнулив его. Делать ЯВНО: SELECT существующих → diff в коде → `UPDATE ... set({...без reservedQty})` / `INSERT` / `DELETE`. Для вариантов SELECT тоже обязателен — нужен существующий `variantId`, чтобы дочерние SKU upsert-ить под правильным variant (а `onConflictDoUpdate ... returning` вернёт id, но diff SKU всё равно нужен — оставляем единый SELECT+diff подход для variants и skus).

> **Orphan-файлы (зафиксировать в progress.md):** когда `colorId` исчезает из формы → DELETE варианта → каскад снесёт строки `media_assets`, но ФАЙЛЫ в `public/images/products/<slug>/` останутся. Тот же отложенный пункт, что и для `deleteProduct` (шаг 4). НЕ чинить сейчас — записать в Learnings.

### Маппер `productToInput` (`src/app/admin/(protected)/catalog/product-mapper.ts`)
- **Маппер НЕ трогаем и НЕ меняем схему.** Форма НЕ управляет `reservedQty`; маппер `productToInput` оставляет как есть (дропает `reservedQty` — это ОК).
- Цель достигается ИСКЛЮЧИТЕЛЬНО в `updateProduct`: при UPDATE существующего SKU **столбец `reservedQty` НЕ включать в `.set()`** → он сохраняется. У новых SKU (INSERT) — `reservedQty: 0`. Никаких правок `skuInputSchema`/маппера для reservedQty не требуется.

## Тесты
- Юнит-проверка через tsx-скрипт (разовый, удалить после): загрузить товар, изменить name + добавить размер в один вариант, сохранить, проверить что `variantId` всех вариантов и `reservedQty` НЕ изменились, новый размер добавлен.
- e2e полного цикла — шаг 7.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
# SQL до/после: зафиксировать variant id и reservedQty
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT pv.id, pv.color_id, s.size, s.reserved_qty FROM product_variants pv JOIN skus s ON s.variant_id=pv.id JOIN products p ON p.id=pv.product_id WHERE p.slug='jacket-sv7-goretex' ORDER BY pv.color_id, s.size;"
# (вручную сохранить товар в админке или tsx-скриптом, затем тот же SELECT — id и reserved_qty те же)
```

## Критерии готовности
- [ ] `updateProduct` использует upsert по `colorId`/`size`, НЕ делает `delete productVariants where productId`
- [ ] Сохранение существующего товара НЕ меняет `product_variants.id` существующих цветов (SQL до/после совпадает по id)
- [ ] Сохранение НЕ обнуляет `skus.reserved_qty` существующих SKU
- [ ] Добавление нового цвета/размера в форме → INSERT; удаление → DELETE (каскад media для удалённого цвета корректен)
- [ ] `createProduct` не затронут (по-прежнему вставляет с нуля)
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `refactor(catalog): updateProduct upsert by colorId/size (preserve variantId + reservedQty)`
