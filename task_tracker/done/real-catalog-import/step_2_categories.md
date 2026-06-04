# Шаг 2: Новые категории + доменные типы Product/Sku

> Зависит от: шаг 1
> Статус: [ ] pending

## Задача

Заменить демо-категории на боевые и расширить доменные типы каталога под новые поля.

### 2.1 contracts
`src/core/contracts/index.ts`:
```ts
export type ProductCategory = 'jackets' | 'pants' | 'shorts' | 'tshirts' | 'polo';
```
(было: `'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts'`)

### 2.2 categories
`src/core/catalog/categories.ts` — `CATEGORIES` массив в порядке витрины:
```ts
export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'jackets', label: 'Куртки' },
  { id: 'pants',   label: 'Брюки' },
  { id: 'shorts',  label: 'Шорты' },
  { id: 'tshirts', label: 'Футболки' },
  { id: 'polo',    label: 'Поло' },
];
```
`CATEGORY_ORDER`, `CATEGORY_LABELS`, `isValidCategory` — строятся из массива, не трогаем.

### 2.3 доменные типы
`src/core/catalog/types.ts`:
- `Product`: добавить `label?: { badge: string; sub: string }` и `care?: string`.
- `Sku`: добавить `article?: string` и `ruSize?: string`.

> Форма label дублируется здесь (НЕ импортировать из db/schema — это нарушит границу: catalog не зависит от формы хранения). Допустимо.

### 2.4 потребители категорий (целиком, чтобы typecheck остался зелёным)

Смена `ProductCategory` ломает хардкод старых id в двух компонентах. Правим их **финальными значениями здесь** (НЕ «минимально» — чтобы не было двойного источника правды со step_6; step_6 их уже не трогает).

**`src/components/Footer.tsx`** — `catalogLinks`:
```ts
const catalogLinks = [
  { label: 'Куртки', href: '/catalog?category=jackets' },
  { label: 'Брюки',  href: '/catalog?category=pants' },
  { label: 'Шорты',  href: '/catalog?category=shorts' },
  { label: 'Футболки', href: '/catalog?category=tshirts' },
  { label: 'Поло',   href: '/catalog?category=polo' },
] as const;
```

**`src/components/home/CategoriesGrid.tsx`** — `homeCategories` (4 плитки, shorts опускаем как и раньше опускали одну):
```ts
const homeCategories: { id: ProductCategory; gradient: string }[] = [
  { id: 'jackets', gradient: 'from-emerald-800 to-stone-900' },
  { id: 'pants',   gradient: 'from-amber-800 to-stone-900' },
  { id: 'tshirts', gradient: 'from-neutral-600 to-emerald-800' },
  { id: 'polo',    gradient: 'from-stone-600 to-slate-900' },
];
```

## Тесты
- `npm run typecheck` зелёный после правки contracts + categories + types + Footer + CategoriesGrid (всё в этом шаге → коммит самодостаточный, типы сходятся).
- `catalog/page.tsx` metadata-текст и `[slug]` — доводка в step_6 (там нет типов-ломающих ссылок, только текст description).

## Команды для верификации

```powershell
npm run typecheck            # зелёный (после минимальной правки потребителей)
npm run lint                 # зелёный
```

Grep — старых категорий в коде нет:
```powershell
# через Grep-инструмент: pattern "hoodies|'t-shirts'" по src/ → 0 в .ts/.tsx (кроме комментариев)
```

## Критерии готовности

- [ ] `ProductCategory` = jackets|pants|shorts|tshirts|polo
- [ ] `CATEGORIES` — 5 категорий с русскими ярлыками в порядке выше
- [ ] `Product` имеет `label?`, `care?`; `Sku` имеет `article?`, `ruSize?`
- [ ] Footer: 5 боевых категорий с правильными href
- [ ] CategoriesGrid: 4 валидные категории (jackets/pants/tshirts/polo)
- [ ] `npm run typecheck` зелёный
- [ ] `npm run lint` зелёный
- [ ] Grep `hoodies` по src/ (.ts/.tsx, без комментариев) — 0
- [ ] Коммит: `feat(catalog): real categories (jackets/pants/shorts/tshirts/polo) + label/care/article/ruSize types`
