# Шаг 4: Карточка товара — выбор размера, «В корзину», coming_soon → wa.me, география

> Зависит от: шаг 3 (useCart), шаг 2 (waLink + whatsapp в настройках)
> Статус: [ ] pending

## Задача

Всё в `src/components/product/ProductDetail.tsx` + страница
`src/app/(public)/catalog/[slug]/page.tsx` + удаление `AvailabilityButton`.

### 1. Прокинуть whatsapp (явная prop-цепочка)

`ProductDetail` — 'use client', данные настроек приходят только через props
с server-страницы. Три правки в связке:

1. `catalog/[slug]/page.tsx` (server, уже force-dynamic): `const settings = await
   getSiteSettings()` (из `@/core/site`) → `<ProductDetail ... whatsapp={settings.whatsapp} />`.
2. Сигнатура `ProductDetail`: добавить `whatsapp: string | null` в props
   (`{ product, images = [], whatsapp }`).
3. `ProductDetail` пробрасывает дальше:
   `<ProductDetailComingSoon product={product} whatsapp={whatsapp} />`
   (строка ~59) — и сигнатура `ProductDetailComingSoon` получает тот же prop.

### 2. Выбор размера (ProductDetail)

Сейчас размеры активного цвета рендерятся как `<span>` (строки 156-170). Заменить
на кнопки-переключатели:

- state `selectedSkuId: string | null`; сбрасывается при смене цвета
  (в `handleColorChange`).
- Если у активного цвета ровно один SKU — он предвыбран автоматически.
- Кнопка размера: `aria-pressed`, `data-testid="size-option"`, выбранная — рамка
  `ring-stone-900` (по образцу выбора цвета выше в файле).

### 3. Кнопка «В корзину»

Удалить `src/components/AvailabilityButton.tsx` и его импорт. На его месте —
`src/components/cart/AddToCartButton.tsx` ('use client'):

- props: `{ item: Omit<CartItem, 'qty'> | null }` — null, пока размер не выбран.
- `item === null` → `disabled`, текст «Выберите размер».
- Клик: `add(item)` + `open()` (drawer появится в шаге 5; до того open() безвреден).
- `data-testid="add-to-cart"`. Стили — те же, что были у AvailabilityButton
  (primary-кнопка на всю ширину).

ProductDetail собирает `item` из `product` + `activeVariant` + выбранного SKU;
`imageUrl` = `shots[0]?.url` (фото активного цвета, может быть undefined),
`price` = `sku.priceOverride ?? product.price`.

### 4. coming_soon: «Узнать о наличии» через wa.me

В `ProductDetailComingSoon` (тот же файл): принять `whatsapp`; если заполнен —
кнопка-ссылка «Узнать о наличии» (`data-testid="ask-availability"`), href =
`waLink(whatsapp, 'Здравствуйте! Подскажите, когда появится «{name}»?')`,
`target="_blank" rel="noopener noreferrer"`. Если whatsapp пуст — кнопки нет.

### 5. География вместо «Доставка по Казахстану»

Строку «Доставка по Казахстану. Возврат 30 дней.» (строка 202) заменить на две:

- `Алматы — заказ через корзину{ · Казахстан — Kaspi}{ · другие страны — Ozon}` —
  сегменты Kaspi/Ozon только при наличии соответствующей ссылки в
  `product.marketplaces`.
- `Возврат 30 дней.` — оставить второй строкой без изменений.

## Тесты

`data-testid="availability-button"` в e2e НЕ используется (проверено ревью:
`e2e/product.spec.ts` содержит только 404-тест) — удаление компонента спеки не
ломает. Тем не менее прогнать ВЕСЬ e2e: шаг меняет разметку размеров/CTA, на
которую могут опираться другие ассерты (например, `storefront-completion.spec.ts`
проверяет `getByText('M', { exact: true })` — текст внутри кнопки размера должен
остаться тем же).

Новый `e2e/cart.spec.ts` (начало; drawer-тесты добавятся в шаге 5). Поведенческие:

- Открыть товар с ≥2 размерами: «В корзину» disabled → клик по размеру
  (aria-pressed=true) → кнопка активна → клик → в `localStorage['tanar-cart']`
  ровно одна позиция с верными skuId/size/qty=1; `cart-count` показывает 1.
- Повторный клик «В корзину» (тот же размер) → qty=2, позиций по-прежнему одна,
  `cart-count` = 2.
- Смена цвета сбрасывает выбранный размер (кнопка снова disabled).
- coming_soon-товар: есть `ask-availability` с href, содержащим `wa.me/` и
  encoded-имя товара. В сиде coming_soon-товаров НЕТ (все 12 published, проверено) —
  тест-блок САМ создаёт coming_soon-товар через админ-UI в своём `beforeAll`
  (логин + форма создания, паттерн — из `admin-crud-media.spec.ts`) и удаляет в
  `afterAll`. Не зависеть от других спеков.
- Карточка published-товара: текст «Алматы — заказ через корзину» виден.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/cart.spec.ts e2e/product.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Без выбранного размера товар добавить нельзя (e2e)
- [ ] Добавление пишет в localStorage и двигает счётчик (e2e)
- [ ] Повторное добавление того же SKU инкрементит qty, не плодит позицию (e2e)
- [ ] coming_soon → wa.me-ссылка (e2e)
- [ ] `AvailabilityButton.tsx` удалён; `grep -r "availability-button" src e2e` — пусто
- [ ] typecheck, lint, build, test:e2e — exit 0
