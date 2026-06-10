# Шаг 3: Админка — откат селекта и текст ошибки при нехватке

> Зависит от: шаг 2 (UpdateOrderStatusResult из action)
> Статус: [ ] pending

## Задача

`src/app/admin/(protected)/orders/OrderStatusSelect.tsx` ('use client'):

- Хранить `prev` (последний УСПЕШНО применённый статус; инициализируется `initial`).
- onChange: оптимистично `setStatus(next)`; в `startTransition` вызвать action:
  - `ok: true` → `prev = next`, ошибка очищается;
  - `ok: false` → `setStatus(prev)` (откат селекта) + показать ошибку.
- Рендер ошибки (`data-testid="status-error"`, под селектом, text-xs text-red-600):
  `result.error`, и если есть `shortages` — по строке на позицию:
  `«{nameSnapshot} — нужно {requested}, доступно {available}»`.
- Типы — из `@/core/orders/client` (НЕ из server-barrel).

`src/app/admin/(protected)/orders/DeleteOrderButton.tsx` ('use client') — мини-правка:
добавить prop `status: OrderStatus` (передаёт `page.tsx` из строки заказа).
`description` confirm-диалога — по статусу, к базовой строке «Заказ и его позиции
будут удалены безвозвратно.» добавить:
- `confirmed` → « Резерв будет снят.»
- `done` → « Списанный остаток на склад не вернётся.»
- `pending`/`cancelled` — без добавки.
(Пользовательница может ожидать возврата остатка при удалении выполненного
заказа — предупреждаем в момент действия.)

## Тесты

Дополнить `e2e/admin-orders.spec.ts` новым serial-блоком «insufficient stock»,
самодостаточным (паттерн создания товара через админ-UI — из `e2e/cart.spec.ts`
блок coming_soon; паттерн заполнения остатка — третья ячейка строки SKU в форме):

1. beforeAll: создать товар «Тестовый Сток X1» (slug `testovyy-stok-x1`), 1 цвет,
   размер M, **stockQty = 1**, статус published.
2. Витрина: добавить M в корзину, qty оставить 1 → оформить заказ (№ запомнить).
   Заказ остаётся в статусе «Новый» (pending) — он переиспользуется в пп. 4–5.
3. Админка: открыть товар, поставить stockQty = 0, сохранить. (Клиентский
   qty-лимит в drawer появится только в шаге 5 — здесь его НЕ проверять.)
4. Админка `/admin/orders`: заказу из п.2 сменить статус на «Подтверждён» →
   `status-error` виден и содержит «нужно 1, доступно 0»; значение селекта
   вернулось к `pending`; reload → статус по-прежнему «Новый» (в БД не записан).
5. В админке вернуть stockQty = 1 → тот же заказ подтвердить снова → ok,
   селект `confirmed`, ошибки нет; reload → `confirmed`.
6. afterAll — порядок важен (FK `order_items.skuId → skus` без cascade):
   СНАЧАЛА удалить заказ крестиком в /admin/orders (заказ к этому моменту
   `confirmed` — confirm-диалог должен содержать «Резерв будет снят», ассертить),
   ПОТОМ товар через админку (как в cart.spec). Иначе удаление товара упадёт на FK.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin-orders.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Нехватка: ошибка с «нужно N, доступно M», селект откатился, БД не изменилась (e2e)
- [ ] После пополнения остатка подтверждение проходит (e2e)
- [ ] Диалог удаления confirmed-заказа содержит «Резерв будет снят» (e2e в afterAll)
- [ ] typecheck, lint, build, test:e2e — exit 0
