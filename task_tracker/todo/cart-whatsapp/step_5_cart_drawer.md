# Шаг 5: Cart drawer — позиции, qty, итого, очистка

> Зависит от: шаг 3 (правит тот же `src/app/(public)/layout.tsx`; CartProvider должен
> уже стоять там), шаг 4 (e2e наполняет корзину через «В корзину»)
> Статус: [ ] pending

## Задача

`src/components/cart/CartDrawer.tsx` ('use client') + рендер в
`src/app/(public)/layout.tsx` внутри `<CartProvider>` (после Footer).

### Поведение/разметка

- Управляется `isOpen/close` из `useCart()`. Закрыт — не рендерит панель (или
  `translate-x-full`; выбрать transform — даёт анимацию `transition-transform`).
- Панель справа: `fixed inset-y-0 right-0 w-full max-w-md` (на 375 — весь экран),
  `data-testid="cart-drawer"`, `role="dialog"` `aria-modal="true"`
  `aria-label="Корзина"`. Backdrop `bg-black/40`, клик по нему — close.
- Escape закрывает (keydown-листенер при открытом). При открытии фокус — на
  кнопку закрытия «×» (`aria-label="Закрыть корзину"`). `overflow-hidden` на body
  при открытом.
- Пустая корзина: «Корзина пуста» + кнопка-ссылка «В каталог» (`/catalog`, close
  по клику).
- Позиция (`data-testid="cart-item"`): миниатюра 64px (`imageUrl` → `<img>`, нет →
  серый блок `bg-stone-200`), название, `{colorLabel} · {size}`, `formatPrice(price)`
  (из `@/core/catalog/client` — НЕ из `@/core/catalog`, server-barrel ломает build),
  qty-степпер «− qty +» (`aria-label="Уменьшить"/"Увеличить"`; − при qty=1 удаляет
  позицию), «×» удалить (`aria-label="Удалить из корзины"`).
- Подвал drawer — ОТДЕЛЬНЫЙ компонент `src/components/cart/CheckoutPanel.tsx`
  ('use client', без props — данные берёт из `useCart()`). Это заглушка с финальным
  API (правило #2: шаг 6 заменит только её внутренности, CartDrawer трогать не
  будет). В этом шаге CheckoutPanel рендерит:
  - строку «Итого: {formatPrice(total)}» (`data-testid="cart-total"`),
  - пометку «Доставка и самовывоз по Алматы»,
  - кнопку «Оформить заказ в WhatsApp» (`data-testid="checkout-button"`) —
    пока `disabled` с `title="Скоро"`, БЕЗ onClick (логика — шаг 6),
  - текстовую кнопку «Очистить корзину» (`data-testid="clear-cart"`): первый клик →
    «Точно очистить?», второй → clear (паттерн ConfirmButton из админки; компонент
    админки НЕ импортировать — витрина не зависит от admin/ui, сделать локально).

## Тесты

Дополнить `e2e/cart.spec.ts` (поведенческие, наполнение — через UI шага 4):

- Клик по `cart-button` → drawer виден; Escape → закрыт; снова открыть → клик по
  backdrop → закрыт.
- Добавить товар → в drawer 1 позиция; «+» → qty 2, `cart-total` = price×2;
  «−» → qty 1, total = price; «−» при qty=1 → позиция исчезла, «Корзина пуста».
- Добавить товар → reload страницы → открыть drawer → позиция на месте
  (localStorage-персистентность).
- «Очистить корзину» (два клика) → пусто, `cart-count` скрыт.
- viewport 375: drawer открывается и позиции читаемы (smoke на мобильном).

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/cart.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Открытие/закрытие: кнопка, Escape, backdrop (e2e — все три)
- [ ] qty ± пересчитывает сумму позиции и итого (e2e)
- [ ] Корзина переживает reload (e2e)
- [ ] Очистка — двухкликовая, обнуляет корзину и счётчик (e2e)
- [ ] role="dialog" + aria-modal + фокус на «×» при открытии
- [ ] typecheck, lint, build, test:e2e — exit 0
