# Step 1 — Findings: Placeholder Inventory (home + blog)

> Скоуп: только home и blog. Каталог (`/catalog`, `/catalog/[slug]`) пропущен по решению.

## Placeholder API

[src/components/Placeholder.tsx](../../../src/components/Placeholder.tsx) принимает `aspect`:

| aspect | CSS | ratio |
|---|---|---|
| `square` | `aspect-square` | 1:1 |
| `portrait` | `aspect-[3/4]` | 3:4 |
| `landscape` | `aspect-[4/3]` | 4:3 |
| `wide` | `aspect-[16/9]` | 16:9 |

Все контейнеры — `rounded-lg overflow-hidden`, gradient через `bg-gradient-to-br`. Логика лейбла — CSS текст поверх градиента (это уйдёт при замене на реальные картинки).

## Layout-максимумы (для расчёта desktop 2x px)

- Главная: все секции кроме Hero внутри `max-w-7xl` = **1280px** контент-ширина
- Hero: full-bleed, `min-h-[80vh]` — ширина = viewport (берём 1920px как базовый десктоп, 2x = 3840px; разумный target = **2560×1440** при 16:9)
- Блог-лист: grid `lg:grid-cols-3` внутри `max-w-7xl` → карточка ≈ **400×300** CSS (1:1 gap-6), 2x = **800×600**
- Blog post hero (`/blog/[slug]`): **`wide` (16:9), full-width** контейнер — сам Placeholder рендерится в `<div className="w-full">` без max-width, значит растягивается на 100% viewport. 2x target = **2560×1440**

## Инвентаризация

| # | File:line | Страница | ID | Что изображает | aspect | CSS px (desktop 1x) | Target px (2x) | Приоритет | Дубль? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [src/components/home/Hero.tsx:9](../../../src/components/home/Hero.tsx#L9) | `/` (home) | `hero-main` | Главный hero: фон-пейзаж за текстом "Встречаем рассвет на высоте" | wide 16:9 (full-bleed, `min-h-[80vh]`) | ~1920×1080+ | **2560×1440** | **P0** | нет |
| 2 | [src/components/home/CategoriesGrid.tsx:25](../../../src/components/home/CategoriesGrid.tsx#L25) | `/` | `cat-jackets` | "Куртки" | square 1:1 | ~300×300 | **800×800** | P1 | нет |
| 3 | там же | `/` | `cat-backpacks` | "Рюкзаки" | square 1:1 | ~300×300 | **800×800** | P1 | нет |
| 4 | там же | `/` | `cat-accessories` | "Аксессуары" | square 1:1 | ~300×300 | **800×800** | P1 | нет |
| 5 | там же | `/` | `cat-tshirts` | "Футболки" | square 1:1 | ~300×300 | **800×800** | P1 | нет |
| 6 | [src/components/home/StoryBlock.tsx:11](../../../src/components/home/StoryBlock.tsx#L11) | `/` (#story) | `story-main` | Блок "Рождены в горах", label="ХАН ТЕНГРИ" | portrait 3:4 | ~600×800 | **1200×1600** | P1 | нет |
| 7 | [src/components/home/FeaturedProducts.tsx:20](../../../src/components/home/FeaturedProducts.tsx#L20) × 4 | `/` | `featured-products` | **4 продуктовых карточки** (через `ProductCard` → `Placeholder` portrait 3:4). Fallback-ветка с `<Placeholder>` рендерится только если `products = []`, что не наш случай | portrait 3:4 | ~300×400 | — | **SKIP** | — |
| 8 | [src/components/home/LatestPosts.tsx:17](../../../src/components/home/LatestPosts.tsx#L17) × 3 | `/` | (reuse of blog covers) | 3 последних поста блога. Placeholder получает `post.gradient` и `post.title` — **та же картинка что на `/blog` и hero поста** | landscape 4:3 | ~380×285 | — | P1 (reuse) | **ДА** |
| 9 | [src/components/BlogCard.tsx:12](../../../src/components/BlogCard.tsx#L12) × 6 | `/blog` | (reuse of blog covers) | 6 карточек в листинге. Та же картинка что и в #8, и в #10 | landscape 4:3 | ~400×300 | **800×600** | P1 (reuse) | **ДА** |
| 10 | [src/app/blog/[slug]/page.tsx:32](../../../src/app/blog/%5Bslug%5D/page.tsx#L32) × 6 | `/blog/[slug]` | `blog-cover-<slug>` × 6 | Hero-картинка поста, full-width 16:9. Источник истины для обложки поста | wide 16:9 (full-width) | ~1920×1080 | **2560×1440** | **P1** | — |
| 11 | [src/components/mdx-components.tsx:14](../../../src/components/mdx-components.tsx#L14) | `/blog/[slug]` | (inline in MDX) | Замена `<img>` в MDX на Placeholder (aspect=landscape, my-8) | landscape 4:3 | ~768×576 | **1536×1152** | P2 | — |

## Ключевые выводы

### 1. Reuse блог-обложек (важно для промптов)

Каждый пост имеет **одну** обложку, которая рендерится в **3 местах**:
- `/blog/[slug]` — hero поста, aspect `wide` 16:9, **full-bleed**
- `/blog` — карточка в листинге, aspect `landscape` 4:3
- `/` (LatestPosts) — карточка, aspect `landscape` 4:3

→ **Генерируем 1 картинку на пост в ориентации 16:9** (максимальный aspect из использований) → в кроп 4:3 попадёт центральная часть. В CSS-компонентах это сейчас один и тот же `aspect-[4/3]` / `aspect-[16/9]` — Next/Image с `object-cover` будет нормально обрезать.

**Итого обложек блога — 6 шт** (по числу MDX-файлов), а не 15.

### 2. FeaturedProducts НЕ входит в скоуп генерации

`FeaturedProducts` рендерит `ProductCard` через `products.slice(0, 4)`. Fallback-ветка с `<Placeholder>` срабатывает только при пустом списке продуктов, чего не происходит (21 продукт в `src/data/products.ts`).

→ На `/` в секции "Избранное" сейчас 4 **продуктовых** Placeholder-а. По скоупу задачи **продукты не генерируем** — раздел остаётся на градиентах до реальной фотосессии. Просто упомянуть в отчёте (секция 9).

### 3. Inline `<img>` в MDX — отсутствуют

`grep -n "<img" content/blog/ → No matches found`. Значит `mdx-components.tsx:14` — это *будущий* fallback, но в текущем контенте не срабатывает.

→ Секция 6.5 в финальном отчёте будет помечена **"не требуется на данный момент"**. Детали тем постов подтвердит Step 2.

### 4. Hero поста — full-bleed, не max-w-7xl

В [src/app/blog/[slug]/page.tsx:31-33](../../../src/app/blog/%5Bslug%5D/page.tsx#L31) Placeholder обёрнут в `<div className="w-full">` без max-width — растягивается на 100% viewport. Это важно для промптов: обложка блога должна быть **cinematic 16:9**, пригодной под full-bleed, не "маленькая карточка".

### 5. Отсутствует поле `cover` в frontmatter блога

[src/lib/blog.ts:5-12](../../../src/lib/blog.ts#L5-L12) — `BlogFrontmatter` содержит только `gradient` (CSS-классы), не `cover` (path к картинке). Когда реальные картинки появятся — нужно будет добавить `cover?: string` и использовать в `BlogCard` / `blog/[slug]/page.tsx` (это отдельная follow-up задача по интеграции, **не в скоупе этого плана**).

## Итоговый список генерируемых картинок (для Step 5)

| # | ID | aspect | target file (конвенция) | chain from |
|---|---|---|---|---|
| 1 | `hero-main` | 16:9 cinematic | `public/images/home/hero.webp` | None (anchor) |
| 2 | `cat-jackets` | 1:1 | `public/images/home/categories/jackets.webp` | hero |
| 3 | `cat-backpacks` | 1:1 | `public/images/home/categories/backpacks.webp` | hero |
| 4 | `cat-accessories` | 1:1 | `public/images/home/categories/accessories.webp` | hero |
| 5 | `cat-tshirts` | 1:1 | `public/images/home/categories/t-shirts.webp` | hero |
| 6 | `story-main` | 3:4 portrait | `public/images/home/story.webp` | hero |
| 7 | `blog-cover-khan-tengri-ascent` | 16:9 | `public/images/blog/khan-tengri-ascent/cover.webp` | hero |
| 8 | `blog-cover-kolsai-backpack-test` | 16:9 | `public/images/blog/kolsai-backpack-test/cover.webp` | hero or #7 |
| 9 | `blog-cover-treks-kazakhstan` | 16:9 | `public/images/blog/treks-kazakhstan/cover.webp` | hero or previous |
| 10 | `blog-cover-choose-jacket-tian-shan` | 16:9 | `public/images/blog/choose-jacket-tian-shan/cover.webp` | hero or previous |
| 11 | `blog-cover-eco-philosophy` | 16:9 | `public/images/blog/eco-philosophy/cover.webp` | hero or previous |
| 12 | `blog-cover-tanar-brand-story` | 16:9 | `public/images/blog/tanar-brand-story/cover.webp` | hero or previous |

Hero сам имеет 4–6 вариантов (hero-main-A … hero-main-F) в Step 5 — Ренат выберет один, остальные не сохраняются.

**Итого: 1 hero + 4 категории + 1 story + 6 обложек блога = 12 картинок генерируем.**

Продукты (4 на главной + 21 каталог + галереи) и inline MDX (0) — не генерируем.
