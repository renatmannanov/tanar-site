# Шаг 6: Витрина под новые категории

> Зависит от: шаг 2 (типы/категории), шаг 5 (боевые данные в БД)
> Статус: [ ] pending

## Задача

Довести витрину до боевого каталога. Footer/CategoriesGrid уже сделаны в step_2 (вместе со сменой типов — чтобы не было двойного источника правды). Здесь: (а) metadata, (б) **фикс показа фото при `models: []`** — иначе вся витрина покажет битые `<Image>`.

### 6.1 КРИТИЧНО — fallback на градиент при пустых models

Боевые товары в снапшоте имеют `variants[].models: []` и фото пока нет. Текущий код:
- `ProductCard.tsx:9-12` — `cardImage = defaultVariant ? getProductCardImage(slug, id, defaultVariant.models[0]) : null`. При `models: []` → `models[0] === undefined`, но `getProductCardImage` **всегда возвращает объект** (не null) → `cardImage` truthy → `showImage = true` → `<Image src="front-undefined-card-md.webp">` → битая картинка на ВСЕХ карточках.
- **Фикс:** условие наличия фото должно учитывать непустые models:
  ```ts
  const defaultVariant = product.variants[0];
  const hasModels = !!defaultVariant && defaultVariant.models.length > 0;
  const cardImage = hasModels
    ? getProductCardImage(product.slug, defaultVariant.id, defaultVariant.models[0])
    : null;
  const showImage = cardImage && !isComingSoon;
  ```
  Тогда при `models: []` → `cardImage = null` → рендерится `Placeholder` (градиент). Это и нужно до появления фото.

- **Проверить `ProductDetail` / галерею:** `getProductGalleryShots` уже возвращает `[]` при пустых `models` (цикл `for (const model of variant.models)` не выполнится, flat — только если `hasFlatShots`). Убедиться, что компонент галереи при пустом массиве шотов показывает `Placeholder`/градиент, а не пустой блок. Если показывает пусто — добавить fallback на `Placeholder` (как в ProductCard). Файл: `src/components/product/ProductDetail.tsx` — прочитать и проверить ветку «нет шотов».

### 6.2 metadata

**`src/app/catalog/page.tsx`** — `metadata.description`:
```ts
description: 'Куртки, брюки, шорты, футболки и поло Tanar.',
```

**`src/app/catalog/[slug]/page.tsx`** — проверить компиляцию с новым типом (CATEGORY_LABELS, getRelatedProducts). Правки кода скорее всего не нужны — только убедиться typecheck зелёный.

### Проверка глазами (dev-сервер)
- `/catalog` — 12 карточек, **все на градиентах (Placeholder), НЕ битые картинки**, чипы: Все / Куртки / Брюки / Шорты / Футболки / Поло.
- `/catalog?category=jackets` — 4 куртки.
- `/catalog?category=polo` — 1 поло.
- `/catalog/jacket-sv7-goretex` — карточка товара рендерится **на градиенте** (без фото), галерея не пустая/не битая, показывает варианты/размеры.
- Главная — 4 плитки категорий, ссылки ведут на валидные категории.
- В DevTools Network — НЕТ 404 на `*-undefined-*.webp` или другие отсутствующие фото боевых товаров.

## Тесты
- e2e переписываются в шаге 7 (здесь не запускаем — они ещё под демо).
- `npm run build` должен пройти (рантайм-рендер читает боевую БД).

## Команды для верификации

```powershell
npm run db:up; npm run db:seed   # боевые данные в БД (предусловие)
npm run typecheck                # зелёный
npm run lint                     # зелёный
npm run build                    # проходит (страницы рендерят боевой каталог)
```

Grep: `hoodies|t-shirts` по src/ (.ts/.tsx) → 0.

## Критерии готовности

- [ ] **ProductCard: при `models: []` показывает Placeholder (градиент), НЕ битый `<Image>`** (guard `models.length > 0`)
- [ ] ProductDetail/галерея: при пустых шотах — fallback на Placeholder, не пустой блок
- [ ] Нет 404 на `*-undefined-*.webp` в Network на `/catalog` и карточке товара
- [ ] catalog/page metadata.description обновлён (без «худи»)
- [ ] catalog/[slug] компилируется с новым типом
- [ ] Grep `hoodies`/`t-shirts` по src/ — 0
- [ ] `npm run build` проходит
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `fix(storefront): gradient fallback for photoless products + catalog metadata`
