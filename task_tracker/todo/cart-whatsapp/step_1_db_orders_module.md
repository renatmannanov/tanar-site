# Шаг 1: Миграция (number, whatsapp) + модуль @/core/orders

> Зависит от: нет
> Статус: [ ] pending

## Задача

Таблицы `orders` / `order_items` УЖЕ существуют (`src/core/db/schema.ts:178-215`,
миграция 0000) — НЕ создавать заново. Нужно: добавить две колонки и реализовать
пустой модуль `src/core/orders/` (сейчас там `export {}`).

### 1. Схема + миграция

В `src/core/db/schema.ts`:

- `orders`: добавить `number: serial('number').notNull()` (импорт `serial` из
  `drizzle-orm/pg-core`) + constraint `unique('orders_number_uq').on(t.number)`.
  Serial на существующей таблице корректно бэкфиллится Postgres'ом.
- `siteSettings`: добавить `whatsapp: text('whatsapp')` (nullable, как остальные поля).

Затем `npm run db:generate` → новая миграция, `npm run db:migrate`.

### 2. Модуль @/core/orders

По образцу `@/core/site` (index.ts = server reads+writes, client.ts = client-safe
типы; см. `src/core/site/index.ts`). Внутри модуля — относительные импорты.

**`src/core/orders/client.ts`** (client-safe, без drizzle/db):

```ts
export type OrderStatus = 'pending' | 'confirmed' | 'done' | 'cancelled';
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Новый', confirmed: 'Подтверждён', done: 'Выполнен', cancelled: 'Отменён',
};
export type OrderItemInput = { skuId: string; qty: number };
export type OrderItemView = { id: string; nameSnapshot: string; priceSnapshot: number; qty: number };
export type OrderView = {
  id: string; number: number; status: OrderStatus; total: number;
  createdAt: string;            // ISO — Date не сериализуется в client props
  items: OrderItemView[];
};
export type CreateOrderResult =
  | { ok: true; order: OrderView }
  | { ok: false; error: string; unavailableSkuIds?: string[] };
```

**`src/core/orders/index.ts`** (server): `export * from './client'` + функции:

- `createOrder(items: OrderItemInput[]): Promise<CreateOrderResult>`
  - zod-валидация: массив 1..30 позиций, `skuId` uuid, `qty` int 1..20.
    Невалидный вход → `{ ok: false, error: 'Некорректный заказ' }` (не throw).
  - Загрузить SKU одним запросом (`inArray`) c join `skus → product_variants →
    products`. Позиция недоступна, если SKU не найден ИЛИ `products.status !==
    'published'`. Есть недоступные → `{ ok: false, error: 'Часть товаров недоступна',
    unavailableSkuIds: [...] }` — заказ НЕ создаётся.
  - Цена позиции = `skus.priceOverride ?? products.priceBase` (из БД, НЕ от клиента).
  - `nameSnapshot` = `` `${product.name} (${colorLabel}, ${size}${ruSize ? '/' + ruSize : ''})` ``.
  - В транзакции (`db.transaction`): insert `orders` (source `'site'`, status —
    дефолт схемы `'pending'`, `total` = сумма) + insert `order_items`.
    Вернуть `{ ok: true, order }` (number — из returning).
- `listOrders(limit = 100): Promise<OrderView[]>` — заказы новее→старше, с items
  (два запроса: orders + items по `inArray(orderId)`, собрать в память).
  Drizzle возвращает `createdAt` как `Date` — в маппере явно
  `createdAt: row.createdAt.toISOString()` (OrderView.createdAt: string).
  При DB-ошибке вернуть `[]` (паттерн `getSiteSettings` — build без БД не падает).
- `updateOrderStatus(id: string, status: OrderStatus): Promise<void>` — update
  status + `updatedAt`. Значение валидировать по union (zod enum).

Stock/резерв НЕ трогать (Фаза 2). `inventoryLog` НЕ писать.

## Тесты

В этом шаге e2e нет (функционал закрывается шагами 6–7). Не сломать существующие:
`npm run test:e2e` должен остаться зелёным (схема обратно совместима — обе колонки
nullable/serial с дефолтом).

## Команды для верификации

```bash
npm run db:generate        # появился новый файл в src/core/db/migrations/
grep -l '"number"' src/core/db/migrations/*.sql      # колонка в новой миграции
grep -l '"whatsapp"' src/core/db/migrations/*.sql    # (формат drizzle-kit может
                                                     #  отличаться — проверить глазами)
npm run db:migrate         # применяется без ошибок
npm run typecheck && npm run lint && npm run build
npm run test:e2e           # старые спеки зелёные
```

## Критерии готовности

- [ ] Миграция содержит ALTER для `orders.number` (serial, unique) и `site_settings.whatsapp`
- [ ] `npm run db:migrate` проходит на dev-БД с данными (seed выполнен)
- [ ] `@/core/orders` экспортирует createOrder/listOrders/updateOrderStatus + типы
- [ ] `@/core/orders/client` не импортирует db/drizzle (проверка: `grep -L "core/db" src/core/orders/client.ts`)
- [ ] typecheck, lint, build, test:e2e — exit 0
