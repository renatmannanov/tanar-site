# Plan: Images Audit & Generation TZ

> Статус: **done**
> Создан: 2026-04-22
> Завершён: 2026-04-22
> Ветка: dev
> Владелец задачи: Renat

## Цель

Собрать полное ТЗ (`review-prompts/images_audit_result.md`) на генерацию картинок для сайта tanar-site с учётом визуальных референсов Patagonia и Arc'teryx. Без правок кода, без генерации картинок — только аналитика и промпты на английском для nano-banana.

## Скоуп

**В скоупе:**
- Hero главной (P0) — 4–6 альтернативных промптов
- 4 карточки категорий (P1)
- Story-блок "Рождены в горах" (P1)
- 6 обложек постов блога (P1)
- Inline-картинки в MDX постах (P2) — только если реально есть `<img>` в теле постов
- Дизайн-аудит 6 референсных URL (3 Patagonia + 3 Arc'teryx)
- Chain-of-generation plan + шаблонный style-block

**Вне скоупа:**
- 21 продуктовая карточка и галереи товаров на `/catalog/*` — остаются CSS-градиентами (обоснование в отчёте)
- Генерация картинок (будет делать отдельное окно с nano-banana MCP)
- Любые правки кода проекта

## Ключевые входные данные

- Исходник ТЗ: [review-prompts/images_audit.md](../../../review-prompts/images_audit.md)
- Placeholder API: [src/components/Placeholder.tsx](../../../src/components/Placeholder.tsx)
- Home-секции: [src/components/home/](../../../src/components/home/)
- Блог: [content/blog/](../../../content/blog/), [src/components/BlogCard.tsx](../../../src/components/BlogCard.tsx), [src/app/blog/[slug]/page.tsx](../../../src/app/blog/%5Bslug%5D/page.tsx), [src/components/mdx-components.tsx](../../../src/components/mdx-components.tsx)
- 6 файлов блога (реальные темы — не выдумывать):
  - `choose-jacket-tian-shan.mdx`
  - `eco-philosophy.mdx`
  - `khan-tengri-ascent.mdx`
  - `kolsai-backpack-test.mdx`
  - `tanar-brand-story.mdx`
  - `treks-kazakhstan.mdx`
- Референсы (WebFetch минимум 1 раз каждый):
  - https://www.patagonia.com/home/
  - https://www.patagonia.com/shop/mens
  - https://www.patagonia.com/stories
  - https://arcteryx.com/us/en
  - https://arcteryx.com/us/en/shop/mens
  - https://arcteryx.com/us/en/explore

## Результат

Один файл: `review-prompts/images_audit_result.md` со всеми 10 секциями из ТЗ.

## Шаги

- [x] **Step 1** — Инвентаризация кода: все места Placeholder на home + blog с file:line, aspect, px. См. [step_1_code_inventory.md](step_1_code_inventory.md) → [_findings_step1.md](_findings_step1.md)
- [x] **Step 2** — Чтение 6 MDX-постов блога: темы, настроение, наличие inline `<img>`. См. [step_2_blog_content_scan.md](step_2_blog_content_scan.md) → [_findings_step2.md](_findings_step2.md)
- [x] **Step 3** — WebFetch 6 референсов и дизайн-аудит (что берём / не берём). См. [step_3_references_audit.md](step_3_references_audit.md) → [_findings_step3.md](_findings_step3.md) (Patagonia частично — сайт в maintenance)
- [x] **Step 4** — Стайлгайд Tanar (палитра, свет, локация, субъект, film look, стоп-лист) + шаблонный style-block для промптов. См. [step_4_styleguide.md](step_4_styleguide.md) → [_findings_step4.md](_findings_step4.md)
- [x] **Step 5** — Промпты Hero P0 (4–6 вариантов, английский, полные) + промпты P1 (4 категории, 1 story, 6 обложек блога) + P2 (inline если есть). См. [step_5_prompts.md](step_5_prompts.md) → [_findings_step5.md](_findings_step5.md) (6 hero + 11 других = 17 промптов; inline не требуется)
- [x] **Step 6** — Сборка финального отчёта `review-prompts/images_audit_result.md` (все 10 секций) + chain-of-generation plan + готовый промпт для окна-генератора. См. [step_6_final_report.md](step_6_final_report.md) → [review-prompts/images_audit_result.md](../../../review-prompts/images_audit_result.md) (803 строки, 10 секций, 39× Tian Shan)
- [x] **Step 7** — Завершение плана (checklist, перенос в done/). См. [step_7_completion.md](step_7_completion.md) — typecheck ✅, lint ✅, git diff по src/ пусто, папка перенесена в done/

## Критерии готовности (всего плана)

- [ ] Файл `review-prompts/images_audit_result.md` существует и содержит все 10 секций из шаблона ТЗ
- [ ] Для hero-главной — 4–6 принципиально разных промптов на английском
- [ ] Каждый не-hero промпт содержит шаблонный style-block (консистентность)
- [ ] Все промпты для блога привязаны к реальным темам постов из `content/blog/*.mdx`
- [ ] WebFetch выполнен по каждому из 6 URL референсов (не меньше 1 раза на URL)
- [ ] Инвентаризация покрывает все Placeholder на home + blog, с file:line
- [ ] Chain-of-generation plan описывает порядок через `generate_image` → `edit_image` с `referenceImages`
- [ ] Секция 10 содержит self-contained промпт для третьего окна (copy-paste ready)
- [ ] В коде tanar-site ничего не изменено (`git diff src/` пусто)

## Ограничения

- Промпты — на **английском**. Комментарии / обоснования — на русском
- Локация-якорь в каждом промпте: Tian Shan / Khan Tengri / Kazakhstani landscape (не Альпы, не Rockies, не Скандинавия)
- Негативные указания обязательны: no logos, no text, no vivid saturation, no bright red / neon, no generic Swiss alpine look
- nano-banana не принимает параметр размера — ориентация словами в промпте
- Фильтр качества: "это приём с конкретного референса или отсебятина?" — если второе, выкидывать

## Риски и заметки

- **WebFetch может вернуть урезанный контент** (JS-heavy сайты). Если не удаётся получить визуальную информацию — явно отметить в отчёте "референс изучен частично" и опираться на общеизвестный визуальный язык брендов
- **Блог может не содержать inline `<img>`** — тогда секция 6.5 в отчёте будет пустой с пометкой "inline изображений в MDX нет, генерация не требуется"
- Размер отчёта — большой (10 секций, ~15+ промптов). Разбивать на подфайлы **не надо** — ТЗ требует один файл `images_audit_result.md`
