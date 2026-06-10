# Review: Code

## Критичное (блокирует выполнение)

### 1. `orderItems.skuId` — FK без `onDelete`, не покрыт шагом 2

`src/core/db/schema.ts`, строка 215–217:
```ts
skuId: uuid('sku_id')
  .notNull()
  .references(() => skus.id),  // нет onDelete: 'cascade'
```

Шаг 2 §5 добавляет в `upsertSkus` и `deleteProduct` чистку `inventory_log` перед удалением SKU/товара — это правильно. Но `order_items.skuId` тоже NOT NULL FK без cascade. Если у SKU есть заказы, `DELETE skus` упадёт на FK-нарушении **до** того, как план что-либо сделал с `order_items`.

Это не новая проблема плана — FK существовал до этого, но с появлением `inventory_log` стала видна вторая непокрытая зависимость. Шаг 2 §5 упоминает только `inventory_log`, про `order_items` — ни слова.

Что нужно: перед `DELETE skus WHERE id IN (toDelete)` в `upsertSkus` и перед удалением SKU в `deleteProduct` — nullify или cascade `order_items.sku_id`. Варианты: добавить `onDelete: 'set null'` на уровне миграции (меняет схему!), либо перед DELETE добавить `UPDATE order_items SET sku_id = NULL WHERE sku_id IN (ids)` — но sku_id NOT NULL, это тоже невозможно без миграции. Единственный рабочий вариант без миграции — `DELETE FROM order_items WHERE sku_id IN (toDelete)` как FK-гигиена.

**Без решения**: `admin-crud-media.spec.ts` упадёт, если у теstovogo товара есть заказы (в e2e шагов 3–7 создаются товары через admin UI, а в afterAll удаляют товары — при наличии несвязанных order_items это взорвётся).

---

### 2. `updateOrderStatusAction` — несовместимое изменение типа возврата

Шаг 2 говорит изменить сигнатуру action:
```ts
// БЫЛО:
export async function updateOrderStatusAction(id, status): Promise<{ error?: string }>
// СТАНЕТ:
export async function updateOrderStatusAction(id, status): Promise<UpdateOrderStatusResult>
```

`OrderStatusSelect.tsx` (строки 33–35) сейчас проверяет `result.error`. После изменения поле называется `result.ok` (false) и `result.error` — структура `UpdateOrderStatusResult` совпадает по полю `error: string`, но **шаг 2 §6 явно говорит**: «в этом шаге `OrderStatusSelect` лишь поправить минимально: `if (!result.ok) setError(result.error)`». Это значит в шаге 2 нужно менять `OrderStatusSelect.tsx` — иначе TypeScript упадёт, потому что тип меняется, а обращение к `.error` на `{ ok: true }` — TS-ошибка (`.error` отсутствует в `ok: true` ветке).

Если шаг 2 выполнить без правки `OrderStatusSelect` — `npm run typecheck` упадёт. Либо нужно уточнить в шаге 2, что минимальная правка компонента — его часть, а не шага 3.

---

## Важное (стоит исправить до начала)

### 3. `clampQty` в `CartProvider` — сигнатура не совпадает с планом

Шаг 4 §5 описывает:
> `clampQty(qty, item)` → `Math.min(CART_MAX_QTY, item.available ?? CART_MAX_QTY, ...)`

Реальная функция (`CartProvider.tsx`, строка 36): `clampQty(qty: number): number` — один аргумент. Функция вызывается в `add` (строки 61, 65) и `setQty` (строка 71). Шаг 4 меняет сигнатуру, но вызовов — три, причём в `add` при `existing` (строка 61) нет прямого доступа к `item.available`, т.к. колбэк `setItems` видит только `prev` items и замкнутый `item` (который `Omit<CartItem, 'qty'>`).

Конкретно: вызов `clampQty(i.qty + qty)` в строке 61 — тут `i` это уже существующий элемент корзины (содержит `available` если его добавили с полем), но `item` (новый) тоже содержит `available`. Логика усложняется: при `add` к существующей SKU нужно брать `available` из `item` (новый снапшот) или из `i` (старый)? План это не уточняет, нужно решить явно.

### 4. Существующий тест `admin-orders.spec.ts` — подтверждение заказа резервирует сток

`admin-orders.spec.ts`, тест «status change to «Подтверждён»» (строка 66): меняет статус на `confirmed` и потом (тест «delete asks for confirmation») удаляет этот подтверждённый заказ. После шага 2, `deleteOrder` confirmed-заказа снимает резерв — это поведение правильное. Тест должен остаться зелёным.

Но: тест подтверждает заказ с товаром `jacket-sv7-goretex` (сток 4–21). Если `reservedQty` для этого SKU уже ненулевой от предыдущих прогонов e2e (накопился резерв без `db:seed`), `available` может упасть ниже 1, и `confirmed` → проверка нехватки → откат. Тест сломается. Нужно убедиться, что `admin-orders.spec.ts` либо запускается после `db:seed`, либо шаг 7 чистит состояние. `admin-crud-media.spec.ts` делает `db:seed` в `afterAll` — достаточно, если тесты запускаются в правильном порядке. Но порядок файлов в playwright не гарантирован без явной конфигурации.

### 5. `step_3` e2e — создание тестового товара с stockQty=1 через admin UI

Шаг 3 описывает:
> «заполнение остатка — третья ячейка строки SKU в форме»

Нужно убедиться, что в реальной форме товара (admin ProductForm) поле stockQty — именно третий input в строке SKU таблицы. В admin-crud-media.spec.ts поля заполняются через `variantBlock.locator('table tbody tr').first().locator('input').first()`. Если порядок input-ов в SKU-строке изменится или появится новый input — тест хрупкий. Это не критично, но нужно проверить реальный порядок полей при написании шага 3.

### 6. `step_4` — тест проверяет `ask-restock` wa.me href с encoded «(…, XL)»

Шаг 4 утверждает что wa.me href содержит encoded «(…, XL)» — конкретно `encodeURIComponent('(…, XL)')`. Функция `waLink` в `src/lib/whatsapp.ts` вероятно использует `encodeURIComponent` на весь текст целиком. Но формат строки задан в шаге 4 как:
```
'Здравствуйте! Подскажите, когда появится «{name}» ({colorLabel}, {size})?'
```
А `coming_soon` тест (`cart.spec.ts`, строка 383) проверяет `href` содержит `encodeURIComponent(NAME)`. Для `ask-restock` — аналогично, но `(colorLabel, XL)` через запятую и скобки тоже нужно будет encoded. Это окей, просто надо проверять правильно в тесте.

---

## Мелочи (можно по ходу)

### 7. `upsertSkus` — в SELECT отсутствует `stockQty` для logManualAdjustments (шаг 6)

`repository.ts`, строка 373–376:
```ts
const existing = await tx
  .select({ id: schema.skus.id, size: schema.skus.size })
```

Шаг 6 требует добавить `stockQty: schema.skus.stockQty` в этот SELECT, чтобы сравнить с новым `sku.stockQty` и вычислить delta. Это поправка одной строки, никаких зависимостей не ломает. Просто нужно не забыть при реализации.

### 8. Комментарий в `orders/index.ts` упоминает Phase 2 hooks — его нужно обновить

`src/core/orders/index.ts`, строка 170 (doc-комментарий `updateOrderStatus`):
```
// PHASE 2 (stock/reserve) hooks in HERE.
```
Шаг 2 говорит заменить этот комментарий. Хорошо, что это явно указано в плане — не пропустите.

### 9. `CartItem.available` — опциональное поле, формат хранения v1 не меняется

Шаг 4 §5 говорит: «Формат хранения v1 НЕ менять». Добавление опционального поля в `CartItem` не ломает `StoredCart` при десериализации — старые корзины без поля корректно дают `undefined`. Правильно. Просто проверить, что `loadCart()` в `lib/cart.ts` не делает строгой валидации полей (сейчас нет — смотрит только `v` и `Array.isArray`).

### 10. `step_7` — удаление заказа №2 (статус `done`) должно проверить что остатки не вернулись

Шаг 7 сценарий п.6: «удалить заказ №2 крестиком — статус done, остатки НЕ возвращаются». В реализации `deleteOrder` (шаг 2 §3): для `done` — «остатки НЕ трогать». Это логично. Но сам шаг 7 проверяет это только через витрину (available 1 после удаления). Нет SQL-ассерта. Достаточно, если `deleteOrder` корректно реализован.

### 11. `step_5` — `CART_MAX_QTY` импортируется в `CartDrawer.tsx`

Шаг 5 говорит «импорт `CART_MAX_QTY` из `@/lib/cart` уже доступен client-safe». В реальном файле `CartDrawer.tsx` нет импорта `CART_MAX_QTY` (строки 1–8 — импортирует только `formatPrice` и `useCart`). Нужно добавить импорт.

---

## Не найдено проблем

- `inventoryLog.skuId` FK без cascade — корректно, шаг 2 §5 это обрабатывает DELETE перед удалением SKU.
- `inventoryLog.refOrderId` FK без cascade — корректно, шаг 2 §3 обнуляет ссылку перед DELETE заказа.
- `tx.rollback()` в drizzle 0.45.x — работает (throws `TransactionRollbackError`, транзакция откатывается).
- `.for('update')` в drizzle `select().from().where().for('update')` — API существует (проверено по `node_modules/drizzle-orm/pg-core/query-builders/select.d.ts`).
- `@/core/inventory/client` vs `@/core/inventory` разделение — план явно указывает не импортировать server-barrel в client-компонентах. Правильный паттерн совпадает с уже установленным в catalog/client.
- `Sku` из `@/core/catalog/client` уже содержит `stockQty`/`reservedQty` (подтверждено: `catalog/types.ts` строки 17–18, `mapSku` в repository.ts строки 23–31) — нового запроса к БД в ProductDetail не нужно.
- Существующий `admin-orders.spec.ts` тест удаляет `confirmed` заказ — после шага 2 `deleteOrder` корректно снимет резерв, тест останется зелёным по логике.
