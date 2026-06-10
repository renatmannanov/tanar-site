# Шаг 3: Ядро корзины — типы, localStorage, CartProvider, счётчик в Header

> Зависит от: нет (параллелен шагам 1–2; не трогает их файлы)
> Статус: [ ] pending

## Задача

### 1. `src/lib/cart.ts` — типы и чистая логика (без React)

```ts
export type CartItem = {
  skuId: string;            // ключ позиции (товар × цвет × размер)
  productId: string;
  slug: string;
  name: string;             // снапшоты — только для отображения;
  colorId: string;          // при оформлении сервер берёт данные из БД
  colorLabel: string;
  size: string;
  ruSize?: string;
  price: number;            // KZT, целые
  qty: number;              // 1..20
  imageUrl?: string;        // первое фото активного цвета на момент добавления
};

export const CART_STORAGE_KEY = 'tanar-cart';
export const CART_MAX_QTY = 20;
export const CART_MAX_ITEMS = 30;

export function loadCart(): CartItem[];        // localStorage, try/catch → []
export function saveCart(items: CartItem[]): void;
export function cartTotal(items: CartItem[]): number;
export function cartCount(items: CartItem[]): number;   // сумма qty
/** Стабильный слепок для дедупа заказов: JSON отсортированных [skuId, qty]. */
export function cartHash(items: CartItem[]): string;
```

Формат хранения: `{ v: 1, items: CartItem[] }`; чужой/битый JSON → пустая корзина.

### 2. `src/components/cart/CartProvider.tsx` ('use client')

Context + хук `useCart()`:

```ts
type CartContextValue = {
  items: CartItem[];
  add(item: Omit<CartItem, 'qty'>, qty?: number): void; // merge по skuId: qty += (кламп 1..20)
  setQty(skuId: string, qty: number): void;             // кламп 1..20
  remove(skuId: string): void;
  clear(): void;
  count: number;
  total: number;
  isOpen: boolean;     // состояние drawer живёт здесь —
  open(): void;        // им пользуются шаги 4 (добавление открывает drawer)
  close(): void;       // и 5 (сам drawer)
};
```

- Гидрация: на сервере и до маунта `items = []`; в `useEffect` после маунта —
  `loadCart()`. Так нет hydration mismatch (счётчик дорисуется на клиенте).
- Каждое изменение items → `saveCart`.
- `add` сверх `CART_MAX_ITEMS` новых позиций — игнорировать молча (защитный предел).
- `useCart()` вне провайдера → throw с понятным сообщением.

### 3. Подключение

- `src/app/(public)/layout.tsx`: обернуть содержимое в `<CartProvider>`
  (Header/Footer внутри провайдера — Header'у нужен счётчик).
- `src/components/cart/CartButton.tsx` ('use client'): кнопка-иконка корзины,
  `aria-label="Корзина"`, `data-testid="cart-button"`, `onClick={open}`;
  бейдж-счётчик `data-testid="cart-count"` (скрыт при 0). Иконка — inline-SVG
  (в проекте нет icon-пакета, не добавлять).
- `src/components/Header.tsx`: `<CartButton />` справа от desktop-nav (виден и на
  мобильном, рядом с бургером).

Drawer в этом шаге НЕ рендерится — `open()` пока просто меняет состояние (шаг 5).

## Тесты

Поведенческих e2e в этом шаге нет (нечем добавить товар — кнопка «В корзину» в шаге 4).
В `e2e/layout.spec.ts` (или smoke) добавить render-ассерт: на главной виден
`cart-button`, `cart-count` отсутствует/скрыт при пустой корзине.
Существующие спеки (layout/responsive пинят Header) — прогнать, обновить если упали.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `CartItem` определён один раз в `src/lib/cart.ts`; компоненты импортят оттуда
- [ ] `lib/cart.ts` не импортирует React/компоненты (нет циклов)
- [ ] Кнопка корзины видна в Header на 375 и 1280 (e2e render)
- [ ] build проходит (провайдер — client, layout — server: граница корректна)
- [ ] typecheck, lint, test:e2e — exit 0
