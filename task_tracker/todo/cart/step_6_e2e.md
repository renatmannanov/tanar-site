# Шаг 6: Playwright smoke на корзину

> Зависит от: шаг 2, шаг 3, шаг 4, шаг 5
> Статус: [ ] pending

## Задача

Создать `e2e/cart.spec.ts` — smoke на ключевой путь корзины. Следовать стилю существующих spec'ов (`e2e/product.spec.ts`, `e2e/catalog.spec.ts`), использовать `data-testid`.

### Сценарии (минимальный набор)

1. **Добавление и счётчик:**
   - открыть страницу товара в продаже (`/catalog/shell-jacket-khan`),
   - кликнуть `add-to-cart`,
   - drawer (`cart-drawer`) виден, в нём 1 `cart-item`,
   - `cart-count` в Header показывает 1.

2. **Управление количеством:**
   - в drawer кликнуть `cart-item-qty-inc`,
   - `cart-total` обновился (× 2 цены),
   - `cart-item-qty-dec` дважды → позиция удаляется, корзина пуста.

3. **Персистентность:**
   - добавить товар, перезагрузить страницу (`page.reload()`),
   - `cart-count` всё ещё показывает количество.

4. **API заказа (через request, не UI):**
   - `request.post('/api/order', { data: <валидное тело> })` → status 200.
   - `request.post('/api/order', { data: { items: [], total: 0, contact: '' } })` → status 400.

5. **(опционально) Полный чекаут через UI:**
   - добавить товар → "Оформить заказ" → заполнить `checkout-contact` → `order-submit` → виден `order-success`.

### Замечания

- В CI секретов Telegram нет → notifier = console → /api/order вернёт 200. Это ожидаемо.
- `reuseExistingServer: true` в конфиге — тест поднимет dev-сервер сам если не запущен.

## Команды для верификации

```bash
npm run test:e2e
# или только корзина:
npx playwright test e2e/cart.spec.ts
```

## Критерии готовности

- [ ] `e2e/cart.spec.ts` создан со сценариями 1–4 (5 — по возможности)
- [ ] `npm run test:e2e` — ВСЕ тесты зелёные (новые + старые)
