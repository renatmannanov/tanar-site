# Initial Build — tanar-site

> Статус: pending
> Дата: 2026-04-22
> Тип: фича (greenfield — первый билд проекта)

## Цель

Собрать v1 маркетингового сайта Tanar end-to-end: home, catalog, blog. Плейсхолдеры вместо картинок (CSS-градиенты). Ralph loop исполняет план автономно.

## Шаги

| # | Файл | Статус |
|---|------|--------|
| 1 | [step_1_scaffold.md](step_1_scaffold.md) | [ ] |
| 2 | [step_2_design_tokens.md](step_2_design_tokens.md) | [ ] |
| 3 | [step_3_layout.md](step_3_layout.md) | [ ] |
| 4 | [step_4_home_page.md](step_4_home_page.md) | [ ] |
| 5 | [step_5_catalog_list.md](step_5_catalog_list.md) | [ ] |
| 6 | [step_6_product_page.md](step_6_product_page.md) | [ ] |
| 7 | [step_7_blog_list.md](step_7_blog_list.md) | [ ] |
| 8 | [step_8_blog_post.md](step_8_blog_post.md) | [ ] |
| 9 | [step_9_content_seed.md](step_9_content_seed.md) | [ ] |
| 10 | [step_10_polish.md](step_10_polish.md) | [ ] |
| 11 | [step_11_verification.md](step_11_verification.md) | [ ] |
| 12 | [step_12_completion.md](step_12_completion.md) | [ ] |

## Критерии готовности (весь план)

- [ ] `npm run build` — exit 0
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] `npm run test:e2e` — все Playwright smoke-тесты проходят
- [ ] Все страницы рендерятся без console errors: `/`, `/catalog`, `/catalog/[slug]` (любой продукт), `/blog`, `/blog/[slug]` (любой пост)
- [ ] Фильтр в `/catalog` по категориям работает
- [ ] ≥20 продуктов в `src/data/products.ts`
- [ ] ≥6 постов в `content/blog/*.mdx`
- [ ] Все плейсшолдеры-картинки — CSS-градиенты (не URL на внешние сервисы, не SVG-файлы), с текст-меткой
- [ ] Responsive: работает на 375px / 768px / 1280px (проверяется Playwright)
- [ ] Все шаги в этом PLAN.md помечены [x]
- [ ] Папка плана перемещена из `todo/` в `done/`

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
