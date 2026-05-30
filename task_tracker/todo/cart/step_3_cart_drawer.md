# Шаг 3: Drawer корзины + счётчик в Header

> Зависит от: шаг 1, шаг 2
> Статус: [ ] pending

## Задача

Сделать выезжающую справа панель корзины и кнопку-иконку со счётчиком в Header.

### `src/components/cart/CartButton.tsx` (`'use client'`)

- Иконка корзины (inline SVG, в стиле MobileNav — `stroke="currentColor"`, `h-6 w-6`).
- Бейдж со счётчиком (`count` из `useCart()`), показывается только если `count > 0`. Маленький кружок stone-900/emerald с белой цифрой в правом верхнем углу иконки.
- По клику — `open()`.
- `data-testid="cart-button"`, на бейдже `data-testid="cart-count"`.
- Важно: счётчик читается из localStorage только на клиенте → пока не смонтировано, рисовать без бейджа, чтобы не было hydration mismatch (паттерн `mounted` через useEffect).

### Подключение в Header

- `src/components/Header.tsx` сейчас server component. Просто импортировать `CartButton` (client) и поставить рядом с `MobileNav` / в desktop nav. Server-компонент может рендерить client-компонент — провайдер уже выше по дереву (шаг 1).
- Разместить `CartButton` так, чтобы был виден и на desktop, и на mobile (вне `hidden lg:flex`).

### `src/components/cart/CartDrawer.tsx` (`'use client'`)

- Управляется `isOpen` из `useCart()`.
- Backdrop (`bg-black/30`) + панель справа (`fixed inset-y-0 right-0 w-full max-w-md`), анимация через `transition-transform translate-x-0 / translate-x-full`.
- Шапка: "Корзина" + кнопка закрыть (X).
- Список позиций (`items`): для каждой —
  - название + colorLabel (если есть),
  - цена за штуку (`formatPrice`),
  - контрол количества (− / число / +), вызывает `changeQty`,
  - кнопка удалить,
  - стоимость позиции (`lineTotal` через `formatPrice`).
- Пустое состояние: "Корзина пуста" + ссылка на /catalog (закрывает drawer).
- Подвал: "Итого" + `total` (`formatPrice`), кнопка "Оформить заказ" (ведёт к форме чекаута — шаг 5; пока в этом шаге кнопка может быть disabled-заглушкой / TODO).
- Esc закрывает (как в MobileNav). Клик по backdrop закрывает.
- `data-testid`: `cart-drawer`, `cart-item`, `cart-item-remove`, `cart-item-qty-inc`, `cart-item-qty-dec`, `cart-total`, `cart-checkout`.

### Подключение CartDrawer

- Рендерить один раз глобально — в `CartProvider` (после children) либо в `layout.tsx` внутри провайдера. РЕШЕНИЕ: рендерить внутри `CartProvider` после `{children}`, чтобы drawer был доступен на любой странице.

## Тесты

- e2e в шаге 6.
- Проверить отсутствие hydration warning в консоли (`mounted`-паттерн для бейджа).

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `CartButton` в Header показывает счётчик при count>0, без hydration mismatch
- [ ] `CartDrawer` открывается/закрывается (кнопка, backdrop, Esc)
- [ ] В drawer: +/− меняет qty, удаление убирает позицию, суммы пересчитываются
- [ ] Пустая корзина показывает осмысленное состояние
- [ ] Итоговая сумма (`cart-total`) совпадает с суммой позиций
- [ ] `npm run build` + существующие e2e зелёные
