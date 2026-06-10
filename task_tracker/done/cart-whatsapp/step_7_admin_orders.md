# Шаг 7: Админка — раздел «Заказы»

> Зависит от: шаг 1 (listOrders/updateOrderStatus); e2e — от шага 6 (заказ создаётся через витрину)
> Статус: [x] done

## Задача

### 1. Включить раздел

`src/app/admin/sections.ts`: у `{ id: 'orders' }` → `enabled: true` (строка уже есть).

### 2. Страница `src/app/admin/(protected)/orders/page.tsx`

Server component, по образцу существующих protected-страниц (`faq/page.tsx`):
`requireAdmin()` + `export const dynamic = 'force-dynamic'`.

- `const orders = await listOrders()` (из `@/core/orders` — server barrel можно,
  это server component).
- Таблица: № | Дата (формат `dd.MM.yyyy HH:mm`, локально без библиотек через
  `toLocaleString('ru-RU', ...)`) | Состав (по строке на позицию:
  `{nameSnapshot} — {qty} шт`) | Сумма | Статус.
- Пусто → «Заказов пока нет».
- Строка заказа: `data-testid="order-row"`.

### 3. Смена статуса

- `src/app/admin/(protected)/orders/actions.ts` ('use server'):
  `updateOrderStatusAction(id: string, status: OrderStatus)` → `requireAdmin()` +
  `updateOrderStatus(...)` + `revalidatePath('/admin/orders')`.
- `src/app/admin/(protected)/orders/OrderStatusSelect.tsx` ('use client'):
  `<Select>` из `@/components/admin/ui/Select` с опциями из `ORDER_STATUS_LABELS`
  (импорт из `@/core/orders/client` — НЕ из `@/core/orders`: client-компонент +
  server barrel = сломанный build). onChange → `startTransition(action)`.
  `data-testid="order-status"`.

## Тесты

Новый `e2e/admin-orders.spec.ts` (auth-паттерн — из `e2e/admin.spec.ts`):

- Через витрину добавить товар и оформить заказ (UI шага 6), запомнить №.
- Логин в админку → /admin/orders → строка с этим № есть, состав содержит имя
  товара, статус «Новый».
- Сменить статус на «Подтверждён» → reload → статус сохранился.
- Без cookie: GET /admin/orders → redirect на /admin/login (существующий
  middleware-паттерн, ассерт по образцу admin.spec).

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin-orders.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] «Заказы» активны в сайдбаре; страница под requireAdmin (e2e: redirect без cookie)
- [ ] Заказ с витрины виден в списке с верным №, составом и суммой (e2e)
- [ ] Смена статуса переживает reload (e2e)
- [ ] typecheck, lint, build, test:e2e — exit 0
