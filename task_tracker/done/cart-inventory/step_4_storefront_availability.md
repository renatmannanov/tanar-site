# Шаг 4: Витрина — точки наличия, правый блок, «Узнать о поступлении», CartItem.available

> Зависит от: шаг 1 (stockLevel из @/core/inventory/client); шаг 2 (createOrder
> уже проверяет наличие — нужен для e2e сценария недоступности)
> Статус: [x] done

## Задача

### 1. Данные

`Sku` из `@/core/catalog/client` УЖЕ содержит `stockQty`/`reservedQty` и приходит
в `ProductDetail` через props — новых выборок не нужно. Считать на клиенте:
`availableQty(sku)` и `stockLevel(...)` из `@/core/inventory/client`
(client-safe; импорт `@/core/inventory` БЕЗ /client сломает build).

### 2. ProductDetail: перечёркнутый распроданный размер

Кнопка размера с `availableQty(sku) <= 0`: добавить классы
`line-through text-stone-400 border-stone-200` (выбранной — оставить ring, но
рамку приглушённую) и `data-soldout="true"`. Кнопка ОСТАЁТСЯ кликабельной —
выбор показывает CTA «Узнать о поступлении» (ниже).

### 3. CTA-блок

В блоке `mt-8` (где AddToCartButton):

- Выбран доступный SKU (или размер не выбран) → как сейчас: `<AddToCartButton item={...} />`
  (item=null пока размер не выбран — поведение не меняется).
- Выбран распроданный SKU → ВМЕСТО AddToCartButton рендерить ссылку
  `data-testid="ask-restock"` (стиль primary-кнопки, как ask-availability):
  - whatsapp заполнен → `href = waLink(whatsapp, 'Здравствуйте! Подскажите, когда
    появится «{name}» ({colorLabel}, {size})?')`, `target="_blank" rel="noopener noreferrer"`,
    текст «Узнать о поступлении»;
  - whatsapp пуст → вместо ссылки disabled-кнопка с текстом «Нет в наличии».

### 4. Строка наличия + география вправо

Заменить текущие два `<p className="mt-3 text-center ...">` на один flex-ряд:

```tsx
<div className="mt-3 flex items-start justify-between gap-4 text-xs text-stone-400">
  {/* слева: индикатор — ТОЛЬКО когда выбран доступный SKU */}
  {selectedSku && available > 0 ? (
    <span data-testid="stock-indicator" data-level={level} className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT_BG[level]}`} />
      В наличии
    </span>
  ) : (
    <span />
  )}
  {/* справа: география + возврат, выравнивание вправо */}
  <span className="text-right">
    Алматы — заказ через корзину{…сегменты Kaspi/Ozon как сейчас…}
    <br />
    Возврат 30 дней.
  </span>
</div>
```

`DOT_BG: Record<Exclude<StockLevel,'out'>, string>` =
`{ high: 'bg-green-500', medium: 'bg-orange-400', low: 'bg-red-500' }` —
локальная константа компонента. e2e проверяет `data-level`, не цвет.

### 5. CartItem.available (lib/cart.ts + CartProvider + AddToCartButton)

- `src/lib/cart.ts`: в `CartItem` добавить `available?: number` (снапшот доступного
  на момент добавления; у старых корзин поля нет — лимита нет, сервер проверит).
  Формат хранения v1 НЕ менять.
- `ProductDetail`: в собираемый `cartItem` добавить `available: availableQty(selectedSku)`.
- `CartProvider`: `clampQty(qty, item)` → `Math.min(CART_MAX_QTY, item.available ?? CART_MAX_QTY, ...)`
  в `add` и `setQty` (сигнатуры контекста не меняются — лимит берётся из самого item).
- Merge при повторном `add` того же SKU: `available` существующей позиции
  ПЕРЕЗАПИСАТЬ значением из НОВОГО item (страница товара свежее снапшота,
  лежащего в корзине) и суммарный qty клампить уже по нему.

UI лимита в drawer («+» disabled + текст) — шаг 5.

## Тесты

Дополнить `e2e/cart.spec.ts` serial-блоком «availability» — самодостаточный товар
через админ-UI (паттерн coming_soon-блока): «Тестовое Наличие X2»
(slug `testovoe-nalichie-x2`), 1 цвет, размеры: S stock=1, M stock=5, L stock=15,
XL stock=0, статус published. afterAll — удалить товар.

- Выбор L → `stock-indicator` виден, `data-level="high"`; M → `medium`; S → `low`.
- Размер не выбран → `stock-indicator` отсутствует.
- XL: кнопка с `data-soldout="true"`; клик → вместо `add-to-cart` есть
  `ask-restock` с href, содержащим `wa.me/` и encoded «(…, XL)».
- Выбор S → добавить в корзину → localStorage item содержит `available: 1`.
- Текст «Алматы — заказ через корзину» по-прежнему виден (геогр. строка переехала,
  существующий ассерт `geography line` не должен упасть).
- Viewport 375×667 (`page.setViewportSize`): выбор L → `stock-indicator` виден;
  выбор XL → `ask-restock` виден; горизонтального скролла нет
  (`document.documentElement.scrollWidth <= 375`).

Существующие cart/checkout-тесты пинят sv7 (сток 4–21, qty ≤ 2) — должны остаться
зелёными без правок; если упали на разметке CTA-блока — чинить ассерт, не дизайн.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/cart.spec.ts
npm run test:e2e
```

## Критерии готовности

- [x] Точка с верным data-level для high/medium/low; нет точки без выбора размера (e2e)
- [x] Распроданный размер перечёркнут; выбор → ask-restock wa.me с размером (e2e)
- [x] CartItem.available пишется при добавлении (e2e: localStorage)
- [x] География справа, «Алматы — заказ через корзину» виден (e2e)
- [x] Viewport 375: индикатор и ask-restock видимы, без горизонтального скролла (e2e)
- [x] typecheck, lint, build — exit 0; cart.spec 22/22
