# Шаг 5: Drawer — лимит «+» по доступному остатку

> Зависит от: шаг 4 (CartItem.available и кламп в CartProvider; правит CartDrawer.tsx)
> Статус: [ ] pending

## Задача

`src/components/cart/CartDrawer.tsx` — внутри позиции (`cart-item`):

- Вычислить `cap = Math.min(CART_MAX_QTY, item.available ?? CART_MAX_QTY)`
  (импорт `CART_MAX_QTY` из `@/lib/cart` уже доступен client-safe).
- Кнопка «+» (`aria-label="Увеличить"`): `disabled={item.qty >= cap}`
  (стиль disabled: `disabled:opacity-40 disabled:cursor-not-allowed`).
- Когда `item.qty >= cap && cap < CART_MAX_QTY` — под степпером строка
  `data-testid="qty-limit"`: «Больше нет в наличии» (text-xs text-stone-400).
  При `cap === CART_MAX_QTY` (лимит — защитный предел корзины, не остаток) —
  текст НЕ показывать, «+» просто disabled.

CartProvider уже клампит в шаге 4 — этот шаг только UI (disabled + текст).

## Тесты

Дополнить блок «availability» в `e2e/cart.spec.ts` (товар из шага 4, S stock=1):

- Добавить S → открыть drawer → у позиции «+» disabled, `qty-limit` виден,
  текст «Больше нет в наличии»; qty остался 1.
- Клик по disabled «+» невозможен (Playwright: `await expect(plus).toBeDisabled()`).
- Для M (stock=5): добавить → «+» активен; нажать «+» 4 раза → qty=5, «+» стал
  disabled, `qty-limit` виден.
- sv7-позиции из старых тестов (сток ≥4, qty ≤2) лимита не видят — старые
  drawer-тесты зелёные без правок.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/cart.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] «+» disabled на лимите остатка; «Больше нет в наличии» виден (e2e)
- [ ] qty не превышает available ни кликами, ни повторным «В корзину» (e2e)
- [ ] Лимит CART_MAX_QTY не показывает текст про наличие (ручная проверка кода)
- [ ] typecheck, lint, build, test:e2e — exit 0
