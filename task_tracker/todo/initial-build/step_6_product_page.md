# Шаг 6: Product page

> Зависит от: шаги 1–5
> Статус: [ ] pending

## Задача

Страница `/catalog/[slug]` — карточка товара с галереей, описанием, характеристиками и кнопкой-заглушкой.

### Порядок действий

1. **Утилиты уже в `src/lib/product.ts`** (добавлены в step_5): `getProductBySlug`, `getAllProductSlugs`, `getRelatedProducts`. **Ничего нового в `product.ts` добавлять не надо.**

2. **Страница `src/app/catalog/[slug]/page.tsx`** — Next 15 async params:

   ```tsx
   import { notFound } from 'next/navigation';
   import { getProductBySlug, getAllProductSlugs, getRelatedProducts, formatPrice, CATEGORY_LABELS } from '@/lib/product';
   import Placeholder from '@/components/Placeholder';
   import ProductCard from '@/components/ProductCard';
   import AvailabilityButton from '@/components/AvailabilityButton';
   import Link from 'next/link';

   type Props = { params: Promise<{ slug: string }> };

   export async function generateStaticParams() {
     return getAllProductSlugs().map(slug => ({ slug }));
   }

   export async function generateMetadata({ params }: Props) {
     const { slug } = await params;                   // ← обязательный await
     const product = getProductBySlug(slug);
     if (!product) return { title: 'Товар не найден — Tanar' };
     return {
       title: `${product.name} — Tanar`,
       description: product.description.slice(0, 160),
     };
   }

   export default async function ProductPage({ params }: Props) {
     const { slug } = await params;                   // ← обязательный await
     const product = getProductBySlug(slug);
     if (!product) notFound();
     const related = getRelatedProducts(product);
     // ... рендер
   }
   ```

   **Ключевое:** оба `generateMetadata` и сам `ProductPage` используют `await params`. Без await — runtime-ошибка.

3. **Layout страницы**:
   - Двухколоночный на desktop (`md:grid-cols-2`), одноколоночный на mobile
   - **Левая колонка — галерея**: 4 плейсхолдера — 1 большой основной (`aspect="portrait"`) сверху + ряд из 3 маленьких (`aspect="square"`) снизу в grid. Все с gradient из `product.gradient` (один цвет — имитация ракурсов)
   - **Правая колонка**:
     - Breadcrumb: `Каталог / [CATEGORY_LABELS[product.category]] / [product.name]` (первые два — `<Link>`, последний — текст)
     - H1: `product.name` (`.font-display text-4xl`)
     - Цена: `formatPrice(product.price)` (крупно, bold, `.font-display`)
     - Описание: `<p>{product.description}</p>` (можно разбить на абзацы по `\n\n`)
     - Таблица характеристик: `<dl>` — для каждой пары из `product.specs` → `<dt>{label}</dt><dd>{value}</dd>`
     - `<AvailabilityButton />` — клиентский компонент (см. ниже)
     - Маленький текст под кнопкой: "Доставка по Казахстану. Возврат 30 дней."

4. **Клиентский компонент `src/components/AvailabilityButton.tsx`**:
   ```tsx
   'use client';

   export default function AvailabilityButton() {
     return (
       <button
         type="button"
         onClick={() => alert('Скоро в продаже')}
         className="..."  // primary стиль
         data-testid="availability-button"
       >
         Узнать о наличии
       </button>
     );
   }
   ```

5. **Блок Related products внизу страницы**:
   - Если `related.length === 0` — не рендерить секцию вообще
   - Иначе: заголовок "Похожие товары" + grid с `<ProductCard product={p} />` для каждого

6. **Playwright spec `e2e/product.spec.ts`**:
   - Тест 1: `/catalog/nonexistent-slug` → статус 404
     ```ts
     const response = await page.goto('/catalog/nonexistent-slug');
     expect(response?.status()).toBe(404);
     ```
   - **Никаких fake-продуктов не создавать** в `src/data/products.ts` (до step_9 массив остаётся пустым). Реальная проверка продуктовой страницы — в step_11 (smoke-suite), где уже будут сиды из step_9.

7. Коммит:
   ```bash
   git add -A
   git commit -m "feat(product): /catalog/[slug] page with gallery, specs, related"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/product.spec.ts
```

Файлы:

```bash
test -f "src/app/catalog/[slug]/page.tsx"
test -f src/components/AvailabilityButton.tsx
test -f e2e/product.spec.ts

grep -q "generateStaticParams" "src/app/catalog/[slug]/page.tsx"
grep -q "notFound" "src/app/catalog/[slug]/page.tsx"
# Двойной await — критично для Next 15
grep -c "await params" "src/app/catalog/[slug]/page.tsx"   # должно быть ≥ 2

# 'use client' на кнопке
grep -q "'use client'" src/components/AvailabilityButton.tsx
```

## Критерии готовности

- [ ] `/catalog/[slug]` страница с галереей (4 плейсхолдера)
- [ ] `generateStaticParams` и `generateMetadata` реализованы
- [ ] В `page.tsx` есть `await params` минимум дважды (в `ProductPage` и `generateMetadata`)
- [ ] Несуществующий slug отдаёт 404
- [ ] `AvailabilityButton` — client component с `'use client'` и alert
- [ ] Таблица характеристик через `<dl>`/`<dt>`/`<dd>`
- [ ] Related products секция (скрывается если пусто)
- [ ] **Не добавлено** fake-продуктов в `src/data/products.ts`
- [ ] Playwright product.spec.ts (минимум 404-тест) проходит
- [ ] Build, typecheck, lint зелёные
- [ ] Коммит
