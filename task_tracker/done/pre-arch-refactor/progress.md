# Progress Log — Pre-architecture refactor

## Контекст для агента

### Где что лежит
- Источник данных: `src/data/products.ts` (10 товаров, поле `gradient` у каждого).
- Слой доступа + типы: `src/lib/product.ts` — `Product`, `ProductColor`, `CATEGORY_LABELS`, `CATEGORY_ORDER`, `ProductCategory`, `isValidCategory`, `getProductCardImage`, `getProductGalleryShots`, `getProductBySlug`, `getProductsByCategory`, `getAllProductSlugs`, `getRelatedProducts`, `formatPrice`.
- Градиенты: `src/lib/gradients.ts` — `OUTDOOR_GRADIENTS`, `Gradient`, `gradientFromString(input)`.
- Использование категорий: `src/components/home/CategoriesGrid.tsx` (свой массив 4 категории с label/href/gradient), `src/app/catalog/page.tsx` (через `CATEGORY_LABELS`), `e2e/catalog.spec.ts` (хардкод 6 labels).
- Использование gradient: `ProductCard.tsx:32` (`product.gradient` в Placeholder fallback), `ProductDetail.tsx` comingSoon-ветка (`product.gradient`).
- Прямой импорт `@/data/products`: `src/app/catalog/page.tsx:1`, `src/components/home/FeaturedProducts.tsx:3`. (Легитимный — только `src/lib/product.ts:104`.)

### КРИТИЧНЫЕ факты (не сломать)
- **CategoriesGrid показывает только 4 категории (jackets, hoodies, t-shirts, pants) — БЕЗ shorts.** Это домашняя страница, декоративная сетка. НЕ добавлять shorts туда — это изменит вид главной.
- **CatalogPage показывает ВСЕ категории из CATEGORY_LABELS (5, включая shorts).** e2e `catalog.spec.ts:12` ожидает на /catalog все 6 чипов: 'Все','Куртки','Худи','Футболки','Штаны','Шорты'. НЕ менять набор категорий на /catalog.
- Поэтому: единый `CATEGORIES` в product.ts = все 5 (jackets, hoodies, t-shirts, pants, shorts) в текущем порядке `CATEGORY_ORDER`. CategoriesGrid берёт оттуда ТОЛЬКО первые 4 (или явный подсписок) — НЕ все. Зафиксировать в шаге 1.
- **Градиенты категорий в CategoriesGrid (`from-emerald-800...` и т.д.) — это ДЕКОРАТИВНЫЕ цвета плиток главной, НЕ из OUTDOOR_GRADIENTS и НЕ связаны с product.gradient.** Их трогать не нужно (оставить в компоненте). Шаг 1 только про labels/id, не про эти градиенты.
- `CATEGORY_LABELS` и `CATEGORY_ORDER` импортируются в нескольких местах — НЕ удалять их, можно вывести (derive) из нового `CATEGORIES`, чтобы старые импорты продолжали работать.

### Ограничения окружения
- Windows / PowerShell. Команды верификации писать под PowerShell или использовать npm-скрипты (они кроссплатформенные). Избегать bash `/dev/null`.
- Playwright поднимает dev на порту **3001** (`npx next dev --port 3001`, `reuseExistingServer:true`). `npm run dev` = 3000. Для e2e просто `npm run test:e2e` — порт не указывать вручную.
- Next.js 15 App Router, Tailwind v3 (нет tailwind.config.ts), TypeScript strict.
- `next.config.ts`: `images.unoptimized: true`. НЕ трогать.

### Что НЕ трогать
- Существующие e2e (home, catalog, product, blog, layout, responsive, smoke) — поведение не меняем.
- Публичные сигнатуры `getProductCardImage(slug,color,model)` и `getProductGalleryShots(product,color)` — рефактор только внутренний.
- Модель Product/ProductColor (размеры/SKU/статусы) — НЕ в этом плане.
- Блог (`src/lib/blog.ts`) — НЕ трогать.

## Learnings
(заполняется в процессе работы)
---
