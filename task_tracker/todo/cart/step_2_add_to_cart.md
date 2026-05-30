# Шаг 2: Кнопка "В корзину" на странице товара

> Зависит от: шаг 1
> Статус: [ ] pending

## Задача

Добавить в `src/components/product/ProductDetail.tsx` кнопку "В корзину", которая кладёт текущий товар с выбранным цветом в корзину и открывает drawer.

### Что сделать

- Создать `src/components/product/AddToCartButton.tsx` (`'use client'`), пропсы: `product: Product`, `colorId: string`, `colorLabel: string`.
  - Использует `useCart()`.
  - По клику: `addToCart({ slug, colorId, name, colorLabel, price, qty: 1 })` затем `open()` (открыть drawer).
  - Кнопка-«основное действие»: стиль как у `AvailabilityButton` (`bg-stone-900 ... text-stone-50`), `data-testid="add-to-cart"`.
- В `ProductDetail.tsx`:
  - Кнопка "В корзину" — основная (вверху), `AvailabilityButton` ("Узнать о наличии") остаётся вторичной ниже, либо убрать её — РЕШЕНИЕ: оставить обе, "В корзину" сверху как primary, "Узнать о наличии" перенести в secondary-стиль (border, без заливки). Marketplace-ссылки остаются как есть.
  - Передать в `AddToCartButton` текущие `activeColor` и `activeVariant?.label ?? ''`.
- comingSoon-ветка (`ProductDetailComingSoon`) — без изменений, там кнопки "В корзину" нет.

### Порядок кнопок в правой колонке (после specs):

1. `AddToCartButton` (primary, заливка stone-900)
2. `AvailabilityButton` (secondary, border-stone-300, текст stone-700)
3. `MarketplaceLinks` (как есть)
4. строка "Доставка по Казахстану..."

## Тесты

- e2e на полный путь добавления — в шаге 6.
- Проверить вручную: добавление товара без вариантов (если такой есть в каталоге) не падает (colorId='').

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
```

## Критерии готовности

- [ ] `AddToCartButton.tsx` создан, `data-testid="add-to-cart"`
- [ ] Кнопка добавляет товар с активным цветом и открывает drawer
- [ ] На comingSoon-товарах кнопки "В корзину" нет
- [ ] `AvailabilityButton` стал вторичным по стилю, не дублирует primary
- [ ] `npm run typecheck` + `npm run build` без ошибок
