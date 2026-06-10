# Шаг 1: Модуль @/core/inventory — уровни наличия + транзакционные переходы

> Зависит от: нет
> Статус: [x] done

## Задача

Модуль `src/core/inventory/` сейчас заглушка (`export {}`). Реализовать по образцу
`@/core/orders`: `client.ts` (client-safe, без db) + `index.ts` (server).

### 1. `src/core/inventory/client.ts` (client-safe)

```ts
export type StockLevel = 'high' | 'medium' | 'low' | 'out';

// Пороги зафиксированы заказчиком 2026-06-11: «больше 10 / 9–3 / меньше 3»;
// значение 10 отнесено к зелёному. Менять — только эти константы.
export const STOCK_LEVEL_HIGH_MIN = 10;
export const STOCK_LEVEL_MEDIUM_MIN = 3;

export function availableQty(sku: { stockQty: number; reservedQty: number }): number; // stockQty - reservedQty
export function stockLevel(available: number): StockLevel;
// >= HIGH_MIN → 'high'; >= MEDIUM_MIN → 'medium'; >= 1 → 'low'; иначе 'out'
```

### 2. `src/core/inventory/index.ts` (server)

`export * from './client'` + транзакционные операции. Тип транзакции — локально,
как в repository.ts: `type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]`
(импорт `db` из `@/core/db`).

```ts
export type InventoryState = 'none' | 'reserved' | 'sold';
export type StockShortage = { skuId: string; requested: number; available: number };
export type TransitionItem = { skuId: string; qty: number };

export async function transitionOrderItems(
  tx: Tx,
  items: TransitionItem[],
  from: InventoryState,
  to: InventoryState,
  refOrderId: string,
): Promise<{ ok: true } | { ok: false; shortages: StockShortage[] }>;

export async function logManualAdjustments(
  tx: Tx,
  entries: { skuId: string; delta: number; note?: string }[],
): Promise<void>; // insert inventory_log reason='manual' для каждой записи; delta=0 пропускать
```

Реализация `transitionOrderItems`:

- `from === to` → `{ ok: true }` без запросов (идемпотентность по построению —
  вызывающий передаёт СТАРЫЙ статус из залоченной строки заказа).
- Залочить SKU: `SELECT id, stock_qty, reserved_qty FROM skus WHERE id IN (...) FOR UPDATE`
  (drizzle: `.for('update')`). Отсутствующий skuId → считать shortage
  (`available: 0`) — заказ мог пережить удаление товара.
- Эффекты состояний на единицу qty: `none` — ничего; `reserved` — `reservedQty +qty`;
  `sold` — `stockQty -qty`. Переход = откат эффекта `from` + применение эффекта `to`.
  Матрица (для справки, реализовать через откат+применение, НЕ через 9 веток):
  - none→reserved: reserved += qty (нужна проверка)
  - none→sold: stock -= qty (нужна проверка)
  - reserved→sold: reserved -= qty; stock -= qty (проверка НЕ нужна: available не падает)
  - reserved→none: reserved -= qty
  - sold→none: stock += qty
  - sold→reserved: stock += qty; reserved += qty (available не падает — без проверки)
- Проверка нехватки — только если переход уменьшает available: т.е. `to`
  забирает (reserved или sold), а `from === 'none'`. Условие:
  `available(после отката from) >= qty`, иначе в shortages. Любая нехватка →
  вернуть `{ ok: false, shortages }` НЕ выполнив ни одного UPDATE (всё или ничего).
  rollback НЕ вызывать НИГДЕ: изменений в БД при shortage нет, вызывающий просто
  выходит из колбэка транзакции, вернув результат. Drizzle `tx.rollback()` БРОСАЕТ
  исключение — в этом плане он не используется вовсе.
- UPDATE по каждому SKU + `updatedAt`.
- Журнал (`inventory_log`), refOrderId = id заказа:
  - снятие резерва (from=reserved) → reason `reservation_release`, delta `-qty`
  - набор резерва (to=reserved) → reason `reservation`, delta `+qty`
  - списание (to=sold) → reason `sale`, delta `-qty`
  - возврат на склад (from=sold) → reason `return`, delta `+qty`
  - связки reserved→sold и sold→reserved дают ДВЕ записи (release+sale / return+reservation).

### 3. Семантика inventory_log.delta — комментарий в схеме

В `src/core/db/schema.ts` у `inventoryLog.delta` заменить комментарий
`// positive = inbound, negative = outbound` на:

```ts
// Signed units. For reason sale/return/manual delta moves stock_qty;
// for reservation/reservation_release delta moves reserved_qty (+ = reserved grew).
```

Схема/миграции НЕ меняются (только комментарий).

## Тесты

e2e в этом шаге нет — модуль ещё ни к чему не подключён (хуки — шаг 2). Не сломать
существующие: `npm run test:e2e` зелёный. ESLint не ругается на неиспользуемые
экспорты модуля (index.ts — публичный API).

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
grep -L "core/db" src/core/inventory/client.ts   # client-safe: db не импортируется
npm run test:e2e
```

## Критерии готовности

- [x] `@/core/inventory/client` экспортирует StockLevel/stockLevel/availableQty/пороги, без db
- [x] `@/core/inventory` экспортирует transitionOrderItems/logManualAdjustments
- [x] transitionOrderItems: FOR UPDATE-лок SKU, всё-или-ничего, shortages при нехватке
- [x] Комментарий-семантика delta в schema.ts; `npm run db:generate` НЕ создаёт миграцию
- [x] typecheck, lint, build, test:e2e — exit 0 (103/103, 2026-06-10)
