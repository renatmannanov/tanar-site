# Шаг 1: Единый источник правды для категорий

> Зависит от: нет
> Статус: [ ] pending

## Задача

Свести определение категорий к одной структуре в `src/lib/product.ts`, переиспользовать везде, не сломав существующие импорты и e2e.

### В `src/lib/product.ts`

Завести единый массив (источник правды):

```ts
export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'jackets',  label: 'Куртки' },
  { id: 'hoodies',  label: 'Худи' },
  { id: 't-shirts', label: 'Футболки' },
  { id: 'pants',    label: 'Штаны' },
  { id: 'shorts',   label: 'Шорты' },
];
```

`CATEGORY_LABELS` и `CATEGORY_ORDER` НЕ удалять (их импортируют ProductCard, catalog/page) — **вывести их из `CATEGORIES`**, чтобы остался один источник:

```ts
export const CATEGORY_ORDER: ProductCategory[] = CATEGORIES.map(c => c.id);
export const CATEGORY_LABELS: Record<ProductCategory, string> =
  Object.fromEntries(CATEGORIES.map(c => [c.id, c.label])) as Record<ProductCategory, string>;
```

Тип `ProductCategory` остаётся как есть (union), `CATEGORIES` ему соответствует.

### В `src/app/catalog/page.tsx`

Сейчас: `const categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];` (строка 13).
Заменить на использование `CATEGORY_ORDER` (или `CATEGORIES.map(c => c.id)`) — поведение идентичное (порядок тот же), но через явный источник. Набор категорий на /catalog НЕ менять (все 5 + «Все» = 6 чипов с e2e).

### В `src/components/home/CategoriesGrid.tsx`

**КРИТИЧНО:** главная показывает только 4 категории (jackets, hoodies, t-shirts, pants), БЕЗ shorts, и с декоративными градиентами плиток. НЕ превращать в «все категории».

Структура локального массива в компоненте — `{ id, gradient }`. `label` и `href` строятся в JSX из id (см. ниже):

```tsx
import { CATEGORY_LABELS, type ProductCategory } from '@/lib/product';

const homeCategories: { id: ProductCategory; gradient: string }[] = [
  { id: 'jackets',  gradient: 'from-emerald-800 to-stone-900' },
  { id: 'hoodies',  gradient: 'from-stone-600 to-slate-900' },
  { id: 't-shirts', gradient: 'from-neutral-600 to-emerald-800' },
  { id: 'pants',    gradient: 'from-amber-800 to-stone-900' },
];

// в JSX:
homeCategories.map((c) => (
  <Link
    key={c.id}
    href={`/catalog?category=${c.id}`}
    data-testid="category-card"
    className="..."
  >
    <Placeholder label={CATEGORY_LABELS[c.id]} gradient={c.gradient} aspect="square" />
  </Link>
))
```

Так label-и берутся из единого источника (если переименуют «Куртки» — поменяется и тут), href формируется из id, набор плиток и декоративные цвета остаются прежними. Внешний вид главной не меняется.

### Тип-каст для `CATEGORY_LABELS`

В примере выше используется `Object.fromEntries(...) as Record<ProductCategory, string>`. Каст **обязателен** — без него TypeScript выведет `Record<string, string>` и typecheck упадёт на местах, где `CATEGORY_LABELS[product.category]` ожидает точный union.

### `e2e/catalog.spec.ts`

Хардкод массива labels на строке 12 — можно оставить как есть (тест проверяет именно отображаемые строки, это нормально для e2e) ИЛИ импортировать из источника. **РЕШЕНИЕ: оставить хардкод в тесте без изменений** — e2e намеренно проверяет конкретный видимый текст, импорт прод-кода в тест создаёт лишнюю связанность. Этот шаг тест не трогает.

## Тесты

- Существующие e2e должны остаться зелёными, особенно `catalog.spec.ts` (6 чипов на /catalog) и `home.spec.ts` (категории на главной).
- Проверить визуально что главная по-прежнему показывает 4 плитки категорий, /catalog — 6 чипов.

## Команды для верификации

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `CATEGORIES` — единственное место со списком категорий; `CATEGORY_LABELS`/`CATEGORY_ORDER` выведены из него
- [ ] Порядок в `CATEGORIES`: `jackets, hoodies, t-shirts, pants, shorts` (совпадает с прежним `CATEGORY_ORDER`)
- [ ] В выведенном `CATEGORY_LABELS` присутствует каст `as Record<ProductCategory, string>`
- [ ] `catalog/page.tsx` использует производную от `CATEGORIES`, не `Object.keys`
- [ ] `CategoriesGrid` берёт label из `CATEGORY_LABELS[c.id]`, `href` строится в JSX как `/catalog?category=${c.id}`, по-прежнему показывает 4 плитки (без shorts), декоративные градиенты сохранены
- [ ] `e2e/catalog.spec.ts` НЕ изменён (хардкод 6 labels оставлен намеренно)
- [ ] Внешний вид главной и /catalog не изменился
- [ ] `npm run test:e2e` зелёный (особенно catalog 6 чипов)
- [ ] Коммит: `refactor(catalog): single source of truth for categories`
