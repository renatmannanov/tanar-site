# Шаг 2: Хуки остатков в updateOrderStatus / deleteOrder / createOrder

> Зависит от: шаг 1 (transitionOrderItems)
> Статус: [x] done

## Задача

Все правки — в `src/core/orders/` (index.ts + client.ts). Импорт инвентаря —
ТОЛЬКО `@/core/inventory` (server barrel; orders/index.ts — server-код).

### 1. Типы результата (orders/client.ts)

```ts
export type StatusShortage = { nameSnapshot: string; requested: number; available: number };
export type UpdateOrderStatusResult =
  | { ok: true }
  | { ok: false; error: string; shortages?: StatusShortage[] };
```

### 2. updateOrderStatus → UpdateOrderStatusResult (orders/index.ts)

Заменить текущую реализацию (плоский UPDATE) на транзакцию:

1. `SELECT * FROM orders WHERE id = $1 FOR UPDATE` (drizzle `.for('update')`);
   нет строки → `{ ok: false, error: 'Заказ не найден' }`.
2. `old = row.status`; `old === status` → `{ ok: true }` (ничего не делать).
3. Маппинг статус → InventoryState (локальная константа в orders):
   `pending: 'none', cancelled: 'none', confirmed: 'reserved', done: 'sold'`.
4. Загрузить позиции заказа (skuId, qty, nameSnapshot).
5. `transitionOrderItems(tx, items, stateOf(old), stateOf(status), id)`.
   - `ok: false` → UPDATE статуса НЕ делать; выйти из колбэка транзакции, вернув
     собранный результат: shortages с `nameSnapshot` (по skuId) →
     `{ ok: false, error: 'Не хватает остатка', shortages }`. Явный `tx.rollback()`
     НЕ вызывать: в drizzle он БРОСАЕТ исключение; изменений в БД к этому моменту
     нет — transitionOrderItems при shortage не делает ни одного UPDATE (step_1).
6. UPDATE status + updatedAt → `{ ok: true }`.

Существующий doc-комментарий «PHASE 2 hooks in HERE» заменить кратким описанием
фактической механики (модель эффектов, ссылка на @/core/inventory).

### 3. deleteOrder (orders/index.ts)

Транзакция: лок заказа FOR UPDATE; если статус `confirmed` —
`transitionOrderItems(tx, items, 'reserved', 'none', id)` (снятие резерва —
заказ исчезает, резерв не должен повиснуть). Если статус `done` — остатки
НЕ трогать: товар физически продан, удаление записи ≠ отмена продажи
(захотят вернуть на склад — сначала переводят в «Отменён», потом удаляют).
`pending`/`cancelled` — без движений. Затем
**обнулить ссылки журнала** — `UPDATE inventory_log SET ref_order_id = NULL
WHERE ref_order_id = $id` (FK без cascade: иначе DELETE заказа упадёт; журнал
сохраняем, ссылку на исчезнувший заказ теряем сознательно); затем DELETE заказа.
Сигнатура остаётся `Promise<void>`.

### 4. createOrder — проверка доступности

В выборку SKU добавить `stockQty: schema.skus.stockQty, reservedQty: schema.skus.reservedQty`.
Позиция недоступна, если (как раньше) SKU не найден ИЛИ продукт не published,
ИЛИ ТЕПЕРЬ `stockQty - reservedQty < qty`. Резерв при создании НЕ ставится
(решение: резерв только на подтверждении). Форма ответа НЕ меняется
(`unavailableSkuIds` — UI-ветка в CheckoutPanel уже работает).

### 5. FK-чистка журнала при удалении SKU/товара (repository.ts)

С этого шага движения пишутся в `inventory_log`, а его FK (`skuId → skus`)
БЕЗ cascade — удаление SKU с историей упадёт. Две правки в
`src/core/catalog/repository.ts`:

- `upsertSkus`, ветка DELETE: перед `DELETE skus` — `DELETE FROM inventory_log
  WHERE sku_id IN (toDelete)` (через `inArray`).
- `deleteProduct`: перед удалением продукта выбрать id всех его SKU и удалить
  их inventory_log-строки.

История удалённых SKU теряется сознательно. Импорт схемы уже есть в файле;
новых cross-module импортов не требуется (прямой db-доступ внутри core/catalog
к таблице журнала здесь допущен сознательно — однострочная FK-гигиена, не бизнес-логика).

### 6. Server action (admin)

`src/app/admin/(protected)/orders/actions.ts` → `updateOrderStatusAction`:
прокинуть новый результат как есть:

```ts
export async function updateOrderStatusAction(id, status): Promise<UpdateOrderStatusResult>
```

(`revalidatePath` — только при `ok: true`). UI-обработку делает шаг 3 — в этом
шаге `OrderStatusSelect` лишь поправить под новый тип результата минимально:
`if (!result.ok) setError(result.error)` (детали shortages рендерит шаг 3).
Эта правка ОБЯЗАТЕЛЬНА внутри этого шага, не опция: без неё `npm run typecheck`
упадёт — компонент ожидает старую форму результата action.

## Тесты

Существующие `admin-orders.spec.ts` остаются зелёными (sv7 имеет сток 4–21,
подтверждение пройдёт). Поведенческий e2e на блокировку/откат — шаг 3,
на жизненный цикл остатков — шаг 7. В этом шаге — только полный прогон.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin-orders.spec.ts e2e/cart.spec.ts
npm run test:e2e
```

## Критерии готовности

- [x] Подтверждение заказа меняет reservedQty (SQL: inventory_log получил
      reservation +1 после admin-orders e2e)
- [x] updateOrderStatus возвращает shortages с nameSnapshot при нехватке
- [x] deleteOrder подтверждённого снимает резерв (SQL: reservation_release -1,
      ref_order_id обнулён)
- [x] createOrder отказывает при available < qty (unavailableSkuIds)
- [x] Повторный вызов updateOrderStatus с тем же статусом — no-op (ранний return
      old === parsed под локом)
- [x] typecheck, lint, build — exit 0; admin-orders+cart спеки 21/21
      (полный test:e2e — на шаге 7)
