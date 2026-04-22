# Шаг 4: Home page

> Зависит от: шаги 1–3
> Статус: [ ] pending

## Задача

Главная страница: hero, сетка категорий, featured продукты (заглушка-массив), сторителлинг, превью последних постов блога.

### Порядок действий

0. **Создать заглушки данных** (используются в Hero/FeaturedProducts/LatestPosts — обязательно ДО импорта):

   **`src/lib/product.ts`** (только типы, без импорта данных — чтобы избежать циклической зависимости):
   ```ts
   export type ProductCategory = 'jackets' | 'backpacks' | 'accessories' | 't-shirts';

   export const CATEGORY_LABELS: Record<ProductCategory, string> = {
     'jackets': 'Куртки',
     'backpacks': 'Рюкзаки',
     'accessories': 'Аксессуары',
     't-shirts': 'Футболки',
   };

   export type Product = {
     slug: string;
     name: string;
     category: ProductCategory;
     price: number;
     currency: 'KZT';
     description: string;
     specs: { label: string; value: string }[];
     gradient: string;
   };

   export function formatPrice(price: number): string {
     return `${price.toLocaleString('ru-RU')} ₸`;
   }
   ```
   (step_5/step_6 дополнят этот файл — `getProductBySlug`, `getAllProductSlugs`, `getRelatedProducts`.)

   **`src/data/products.ts`** — пустой массив-заглушка:
   ```ts
   import type { Product } from '@/lib/product';
   export const products: Product[] = [];
   ```
   (step_9 полностью перезапишет содержимое реальными продуктами.)

   **`src/lib/blog.ts`** — заглушка с типом и безопасными функциями (step_7 перепишет полностью):
   ```ts
   export type BlogPost = {
     title: string;
     slug: string;
     date: string;
     excerpt: string;
     gradient: string;
     author: string;
     content: string;
   };

   export function getAllPosts(): BlogPost[] {
     return [];
   }

   export function formatPostDate(iso: string): string {
     return new Date(iso).toLocaleDateString('ru-RU', {
       day: 'numeric', month: 'long', year: 'numeric',
     });
   }
   ```

1. **Hero section `src/components/home/Hero.tsx`**:
   - Full-width, высота `min-h-[80vh]`
   - Фон — большой `<Placeholder label="" gradient="from-slate-700 via-stone-800 to-emerald-900">` абсолют-позиционированный на всю площадь
   - Поверх: крупный заголовок `.font-display text-5xl md:text-7xl` — "Встречаем рассвет на высоте."
   - Подзаголовок: "Одежда и снаряжение, рождённое в предгорьях Хан Тенгри."
   - Две кнопки: primary "Смотреть каталог" (`/catalog`) и ghost "О бренде" (`#story`)
   - Текст белый, контейнер с padding, вертикальное выравнивание по центру

2. **Категории `src/components/home/CategoriesGrid.tsx`**:
   - Секция `<section>` с заголовком "Категории"
   - 4 карточки-квадрата в grid (2×2 на mobile, 4×1 на desktop):
     - "Куртки" → `/catalog?category=jackets`, gradient `from-emerald-800 to-stone-900`
     - "Рюкзаки" → `/catalog?category=backpacks`, gradient `from-stone-600 to-slate-900`
     - "Аксессуары" → `/catalog?category=accessories`, gradient `from-amber-800 to-stone-900`
     - "Футболки" → `/catalog?category=t-shirts`, gradient `from-neutral-600 to-emerald-800`
   - Каждая карточка: `<Placeholder aspect="square" label="НАЗВАНИЕ">` + hover-эффект (scale 1.02, transition)

3. **Featured products `src/components/home/FeaturedProducts.tsx`**:
   - Заголовок "Избранное"
   - Импортирует `products` из `@/data/products` и берёт `products.slice(0, 4)`
   - **Инлайн-рендер в этом шаге** (без импорта `ProductCard` — его ещё не существует). Каждый item рендерится через `<Placeholder aspect="portrait" label={p.name} gradient={p.gradient}>` + название + цена (через `formatPrice`)
   - Если `products.slice(0, 4).length === 0` — рендерит 4 Placeholder'а со статичным текстом "Скоро здесь", gradient `from-stone-600 to-stone-900`
   - В step_5 этот компонент будет переписан — заменит инлайн на `<ProductCard product={p} />`

4. **Story block `src/components/home/StoryBlock.tsx`**:
   - `id="story"` — якорь
   - Двухколоночный layout (на desktop): слева `<Placeholder aspect="portrait">` с меткой "ХАН ТЕНГРИ", справа текст
   - Заголовок "Рождены в горах"
   - 2-3 абзаца lorem-ipsum на тему бренда (казахские горы, ремесло, природа). НЕ латинский lorem — на русском, реальные осмысленные предложения про бренд. Пример: "Tanar — казахское слово, означающее 'встречающая рассвет'..."

5. **Latest blog posts `src/components/home/LatestPosts.tsx`**:
   - Заголовок "Журнал"
   - **Прямой импорт** `import { getAllPosts, formatPostDate } from '@/lib/blog'` — файл-заглушка уже создан в шаге 0 этого step'а, функция возвращает `[]`. Никакого try/catch или динамического импорта.
   - `const posts = getAllPosts().slice(0, 3)`
   - Если `posts.length === 0` — рендерит 3 Placeholder'а со статичным текстом "Скоро здесь появятся истории", gradient `from-slate-700 to-stone-900`
   - Иначе — для каждого поста: Placeholder + дата (`formatPostDate`) + заголовок + excerpt
   - Кнопка "Все посты" → `/blog`
   - В step_7 `blog.ts` будет переписан — `getAllPosts` начнёт читать реальные MDX-файлы. Компонент перерендерится без изменений в нём самом.

6. **Сборка в `src/app/page.tsx`**:
   ```tsx
   export default function HomePage() {
     return (
       <>
         <Hero />
         <CategoriesGrid />
         <FeaturedProducts />
         <StoryBlock />
         <LatestPosts />
       </>
     );
   }
   ```
   - Удалить "Coming soon" заглушку из step_3

7. **Playwright spec `e2e/home.spec.ts`**:
   - Тест 1: открыть `/`, проверить что H1 "Встречаем рассвет" виден (`getByRole('heading', { level: 1 })`)
   - Тест 2: категорий на странице ровно 4 (селектор по data-testid или role)
   - Тест 3: клик на "Смотреть каталог" → URL `/catalog`
   - Тест 4: sections с заголовками "Категории", "Избранное", "Рождены в горах", "Журнал" все видимы

8. Коммит:
   ```bash
   git add -A
   git commit -m "feat(home): hero, categories, featured, story, latest posts"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/home.spec.ts
```

Файлы:

```bash
# Заглушки данных созданы
test -f src/lib/product.ts
test -f src/data/products.ts
test -f src/lib/blog.ts
grep -q "export type Product" src/lib/product.ts
grep -q "export const products" src/data/products.ts
grep -q "getAllPosts" src/lib/blog.ts

# Home-компоненты
test -f src/components/home/Hero.tsx
test -f src/components/home/CategoriesGrid.tsx
test -f src/components/home/FeaturedProducts.tsx
test -f src/components/home/StoryBlock.tsx
test -f src/components/home/LatestPosts.tsx
test -f e2e/home.spec.ts
```

## Критерии готовности

- [ ] `src/lib/product.ts` с типами создан
- [ ] `src/data/products.ts` с пустым массивом создан
- [ ] `src/lib/blog.ts` с заглушкой `getAllPosts() => []` создан
- [ ] Все 5 секций главной реализованы
- [ ] H1 с брендовым сообщением
- [ ] 4 категории ведут на `/catalog?category=...`
- [ ] Story block с `id="story"` (якорь из шапки работает)
- [ ] Home page не падает даже если products и posts пустые
- [ ] Playwright home.spec.ts проходит
- [ ] Build, typecheck, lint зелёные
- [ ] Коммит
