# Шаг 1: Ядро корзины — типы, контекст, хранилище

> Зависит от: нет
> Статус: [ ] pending

## Задача

Создать `src/lib/cart.ts` (типы + чистые функции) и `src/components/cart/CartProvider.tsx` (React Context + localStorage). Подключить `CartProvider` в `src/app/layout.tsx`.

### `src/lib/cart.ts`

```ts
export type CartItem = {
  slug: string;
  colorId: string;        // '' если у товара нет вариантов
  name: string;           // снимок названия на момент добавления
  colorLabel: string;     // '' если нет варианта
  price: number;          // KZT, снимок цены
  qty: number;
};

export type Order = {
  items: CartItem[];
  total: number;
  contact: string;
  createdAt: string;      // ISO
};
```

Чистые функции (без побочных эффектов, легко тестировать):
- `cartItemKey(slug, colorId): string` → `${slug}::${colorId}`
- `addItem(items: CartItem[], item: CartItem): CartItem[]` — если ключ есть, qty += item.qty; иначе push.
- `removeItem(items, key): CartItem[]`
- `setQty(items, key, qty): CartItem[]` — qty < 1 удаляет позицию.
- `cartTotal(items): number` — сумма price*qty.
- `cartCount(items): number` — сумма qty.
- `lineTotal(item): number` — price*qty.

### `src/components/cart/CartProvider.tsx` (`'use client'`)

- Context value: `{ items, addToCart(item), remove(key), changeQty(key, qty), clear(), count, total, isOpen, open(), close() }`.
- При маунте читает `localStorage['tanar-cart']` (try/catch, при ошибке — пустой массив).
- На каждое изменение `items` пишет в `localStorage`.
- `useCart()` хук — кидает понятную ошибку если вызван вне провайдера.
- `isOpen/open/close` управляют drawer (используется в шаге 3).

### `src/app/layout.tsx`

Обернуть `{children}` (и Header) в `<CartProvider>`. Header должен быть внутри провайдера, т.к. в шаге 3 в нём появится счётчик.

## Тесты

- Юнит-тестов в проекте нет (только e2e). Не вводим новый тест-раннер. Чистые функции `cart.ts` проверяются через e2e в шаге 6 косвенно.
- Существующие e2e не должны сломаться от добавления провайдера в layout.

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `src/lib/cart.ts` экспортирует все перечисленные типы и функции
- [ ] `src/components/cart/CartProvider.tsx` создан, `'use client'`, читает/пишет localStorage
- [ ] `CartProvider` оборачивает контент в `layout.tsx`, Header внутри провайдера
- [ ] `npm run typecheck` без ошибок
- [ ] `npm run build` проходит
- [ ] `npm run test:e2e` — все существующие тесты зелёные
