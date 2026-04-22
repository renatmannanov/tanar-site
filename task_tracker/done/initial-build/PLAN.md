# Initial Build — tanar-site

> Статус: done
> Дата: 2026-04-22
> Тип: фича (greenfield — первый билд проекта)

## Цель

Собрать v1 маркетингового сайта Tanar end-to-end: home, catalog, blog. Плейсхолдеры вместо картинок (CSS-градиенты). Ralph loop исполняет план автономно.

## Шаги

| # | Файл | Статус |
|---|------|--------|
| 1 | [step_1_scaffold.md](step_1_scaffold.md) | [x] |
| 2 | [step_2_design_tokens.md](step_2_design_tokens.md) | [x] |
| 3 | [step_3_layout.md](step_3_layout.md) | [x] |
| 4 | [step_4_home_page.md](step_4_home_page.md) | [x] |
| 5 | [step_5_catalog_list.md](step_5_catalog_list.md) | [x] |
| 6 | [step_6_product_page.md](step_6_product_page.md) | [x] |
| 7 | [step_7_blog_list.md](step_7_blog_list.md) | [x] |
| 8 | [step_8_blog_post.md](step_8_blog_post.md) | [x] |
| 9 | [step_9_content_seed.md](step_9_content_seed.md) | [x] |
| 10 | [step_10_polish.md](step_10_polish.md) | [x] |
| 11 | [step_11_verification.md](step_11_verification.md) | [x] |
| 12 | [step_12_completion.md](step_12_completion.md) | [x] |

## Критерии готовности (весь план)

- [x] `npm run build` — exit 0
- [x] `npm run typecheck` — exit 0
- [x] `npm run lint` — exit 0
- [x] `npm run test:e2e` — все Playwright smoke-тесты проходят
- [x] Все страницы рендерятся без console errors: `/`, `/catalog`, `/catalog/[slug]` (любой продукт), `/blog`, `/blog/[slug]` (любой пост)
- [x] Фильтр в `/catalog` по категориям работает
- [x] ≥20 продуктов в `src/data/products.ts`
- [x] ≥6 постов в `content/blog/*.mdx`
- [x] Все плейсшолдеры-картинки — CSS-градиенты (не URL на внешние сервисы, не SVG-файлы), с текст-меткой
- [x] Responsive: работает на 375px / 768px / 1280px (проверяется Playwright)
- [x] Все шаги в этом PLAN.md помечены [x]
- [x] Папка плана перемещена из `todo/` в `done/`

## Контекст для Ralph

- Проект: `c:/Users/renat/projects/tanar-site/`
- Бренд: **Tanar** (каз. "встречающая рассвет"), логотип — силуэт Хан Тенгри
- Язык сайта: русский
- Вдохновение: Patagonia + Arc'teryx (outdoor, много воздуха, строгая типографика)
- Стек зафиксирован в [CLAUDE.md](../../../CLAUDE.md)
- Ветка для работы: `dev` (создать в step_1)
- Коммиты: Conventional Commits на английском (`feat:`, `chore:`, `fix:`, `refactor:`)
- Git remote уже настроен: `origin → https://github.com/renatmannanov/tanar-site.git`
- **НЕ делать push** — только локальные коммиты
