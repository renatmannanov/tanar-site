# Review Summary — Storefront Completion

> Дата: 2026-06-01
> Ревью: code + risks + structure (3 агента, sonnet)
> **СТАТУС: рекомендации внесены в step-файлы 2026-06-01.**

## Критичное (блокирует / даёт 500 / красный тест)

1. **Slug-коллизия → 500** (risks #1). Два товара с одинаковым названием → одинаковый slug → Postgres `23505` (slug UNIQUE) в `createProduct`, не перехвачен → необработанный 500. → **Шаг 1/3: `createProductAction` ловит код `23505` и возвращает `{error: 'Товар с таким slug уже существует — измените название'}`. Зафиксировать.**

2. **Пустой slug → 500** (risks #2, code мелочь). `slugify('®™ / ')` → `''` → zod `min(1)` бросит ValidationError → 500. → **Шаг 1: дизейблить кнопку «Создать» при `form.slug.trim()===''`.**

3. **`e2e/admin-crud-media.spec.ts:43` сломается** (code критичное). Тест делает `page.locator('#slug').fill(TEST_SLUG)` — после шага 1 поле `readOnly` всегда → Playwright не заполнит. `slugify('E2E Test Product')`=`'e2e-test-product'` совпадёт с TEST_SLUG. → **Шаг 1: убрать строку `fill('#slug', ...)` из admin-crud-media.spec.ts (slug теперь автоген из name).**

## Важное

4. **`STOREFRONT_VISIBLE` типизация** (code). Без `as const`/`ProductStatus[]` Drizzle `inArray` может дать type error. → **Шаг 3: `const STOREFRONT_VISIBLE = ['published','coming_soon'] as const satisfies readonly ProductStatus[]`.**

5. **`getStorefrontProductsByCategory(null)`** (code). Должна звать `getStorefrontProducts()`, НЕ `getAllProducts()` (иначе при «Все категории» вернёт и скрытые). → **Шаг 3: явно зафиксировать.**

6. **`generateMetadata` не забыть** (risks #3). На `/catalog/[slug]` две точки вызова `getProductBySlug` — в `generateMetadata` И в `ProductPage`. Переключить ОБЕ на storefront. → **Шаг 3: выделить явным пунктом-чеклистом.**

7. **e2e slug hardcode** (risks #5). Тест ждёт `testovaya-kurtka-x1` — зависит от точной таблицы транслита. → **Шаг 1: зафиксировать ПОЛНУЮ таблицу транслита 33 буквы как канон. Шаг 5: ожидаемый slug вывести из той же таблицы; для «Тестовая Куртка X1» → `testovaya-kurtka-x1`.**

8. **Остановить dev перед build** (structure #3). Шаги 1-4 кончаются `npm run dev`; шаг 5 гонит `build` → затрёт `.next` под dev. → **Шаг 5: добавить в команды «остановить dev перед build» (грабля из progress.md).**

9. **specs-тест: один путь** (risks #6, structure step_2). Шаг 5 п.2 даёт два пути проверки (round-trip на edit ИЛИ витрина после publish). → **Шаг 5: зафиксировать ОДИН — round-trip на edit-странице (без publish; витрину проверяет п.4 после publish).**

10. **Порядок при пошаговой верификации 3 перед 4** (structure #1). Шаги 3/4 независимы по файлам, НО e2e «draft→404» зелёный только после шага 3. → **PLAN.md: рекомендованный порядок 3→4 уже есть; в шаге 4 отметить, что полный e2e статусов — после шага 3 (шаг 5).**

## Мелочи
- Шаг 2: фильтровать пустые specs по `label.trim()===''` ИЛИ `value.trim()===''` (оба), не только label (code).
- Шаг 4: `activeVariant?.skus ?? []` — защита от undefined (code).
- `getAllProductSlugs` storefront-вариант НЕ нужен (нигде на витрине не зовётся) — подтверждено (code). Убрать сомнение из шага 3.
- Шаг 2 формулировка «ИЛИ... Зафиксировано» — оставить только финал (structure #2).
- Шаг 6: указать путь `task_tracker/backlog/ARCHITECTURE-ecommerce.md` (structure).

## Противоречия между ревьюерами
Нет. Находки взаимодополняющие.

## Рекомендации (по приоритету)
1. Шаг 1: slug-коллизия (catch 23505), пустой slug (disable кнопки), полная таблица транслита, убрать fill('#slug') из admin-crud-media.spec.
2. Шаг 3: STOREFRONT_VISIBLE типизация, getStorefrontProductsByCategory(null)→getStorefrontProducts, generateMetadata явным пунктом.
3. Шаг 5: остановить dev перед build, specs-тест round-trip, slug ожидание из таблицы.
4. Мелочи: specs-фильтр label&value, activeVariant?.skus, чистка формулировок.
