# Шаг 4: Витрина — кнопки МП ведут на карточку выбранного размера

> Зависит от: шаг 3 (витринному e2e нужны sku-ссылки, записанные через таб
> админки — данные создаёт сценарий шага 3, спек-файл общий)
> Статус: [x] done (полный test:e2e и build — в шаге 5)

## Задача

### 1. `src/components/product/ProductDetail.tsx`

После вычисления `selectedSku` собрать эффективную мапу ссылок (SKU-ключи
перекрывают продуктовые; отсутствующий у SKU ключ падает на продуктовый):

```ts
// Sku-level links override the product-level fallbacks; missing keys fall
// back per-marketplace (Kaspi may be per-size while Ozon stays product-wide).
const effectiveMarketplaces = {
  ...product.marketplaces,
  ...Object.fromEntries(
    Object.entries(selectedSku?.marketplaces ?? {}).filter(([, v]) => !!v),
  ),
} as Partial<Record<Marketplace, string>>;
```

- `<MarketplaceLinks marketplaces={effectiveMarketplaces} />` вместо текущего
  `product.marketplaces && <MarketplaceLinks marketplaces={product.marketplaces} />`
  (сам компонент уже возвращает null при пустой мапе — обёртка-условие
  больше не нужна).
- Строка географии (`Казахстан — Kaspi` / `другие страны — Ozon`) остаётся на
  `product.marketplaces` (продуктовый уровень) — НЕ переключать на effective:
  сегменты не должны мигать при выборе размера.
- `MarketplaceLinks.tsx` НЕ меняется (уже принимает произвольную мапу).
- Импорт типа `Marketplace` — из `@/core/catalog/client` (уже client-safe).

### 2. e2e — дополнить блок «per-sku links» в `e2e/admin-marketplaces.spec.ts`

Продолжение блока шага 3 (sv7, afterAll-db:seed восстановит):

1. В админке (таб «Маркетплейсы»): продуктовая Kaspi =
   `https://kaspi.kz/shop/p/product-level`, у строки TANAR-001 (Чёрный M)
   Kaspi = `https://kaspi.kz/shop/p/sku-m-001`, у TANAR-002 (Чёрный L) — пусто.
   Ozon нигде не заполнять. Сохранить.
2. Витрина `/catalog/jacket-sv7-goretex` (цвет Чёрный — выбрать кликом по
   свотчу `aria-label="Чёрный"`, дождаться `aria-pressed`):
   - размер НЕ выбран → кнопка Kaspi href = `.../product-level`;
     кнопки Ozon нет;
   - выбран M → href = `.../sku-m-001` (подмена);
   - выбран L (у SKU ссылки нет) → href = `.../product-level` (fallback);
   - снова M → href снова `.../sku-m-001` (state не залипает).

## Тесты

Поведенческий e2e выше (клики по размерам меняют href — 'use client').
Могут сломаться: существующие три теста admin-marketplaces (продуктовый
уровень) — НЕ должны: размер в них не выбирается, effective == product map.
cart.spec availability-блок не трогает кнопки МП.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin-marketplaces.spec.ts e2e/cart.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Размер выбран и у SKU есть ссылка → href кнопки = ссылка SKU (e2e)
- [ ] Размер не выбран → продуктовая ссылка (e2e)
- [ ] У выбранного SKU нет ссылки → продуктовый fallback (e2e)
- [ ] Кнопка МП отсутствует, только если нет ни SKU-, ни продуктовой ссылки (e2e: Ozon)
- [ ] Полный `npm run test:e2e` зелёный
- [ ] typecheck, lint, build — exit 0
