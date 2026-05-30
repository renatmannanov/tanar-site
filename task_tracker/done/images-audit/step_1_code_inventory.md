# Step 1: Code Inventory (Placeholder usage on home + blog)

> Статус: pending

## Цель

Найти и задокументировать все места где на home-страницах и в блоге используется `Placeholder.tsx` (или любой другой градиент-заглушка). Для каждого — точная локация, что изображает, aspect ratio, размер на экране.

Каталог (`/catalog`, `/catalog/[slug]`) **пропускаем** — он остаётся на градиентах по политическому решению.

## Что делать

1. Прочитать API компонента-заглушки:
   - [src/components/Placeholder.tsx](../../../src/components/Placeholder.tsx)

2. Прочитать home-секции:
   - [src/components/home/Hero.tsx](../../../src/components/home/Hero.tsx)
   - [src/components/home/CategoriesGrid.tsx](../../../src/components/home/CategoriesGrid.tsx)
   - [src/components/home/StoryBlock.tsx](../../../src/components/home/StoryBlock.tsx)
   - [src/components/home/FeaturedProducts.tsx](../../../src/components/home/FeaturedProducts.tsx)
   - [src/components/home/LatestPosts.tsx](../../../src/components/home/LatestPosts.tsx)

3. Прочитать блог:
   - [src/components/BlogCard.tsx](../../../src/components/BlogCard.tsx)
   - [src/app/blog/[slug]/page.tsx](../../../src/app/blog/%5Bslug%5D/page.tsx)
   - [src/components/mdx-components.tsx](../../../src/components/mdx-components.tsx) — как там обрабатывается `<img>`

4. Найти grep-ом все использования `<Placeholder`, `Placeholder` и возможные inline `bg-gradient-*` на home/blog страницах — вдруг заглушка где-то сделана не через компонент.

5. Для каждого найденного места записать:
   - `file:line` (строка тега / ключевая строка)
   - Название компонента / контекст
   - Что изображает (hero / category:jackets / story / blog cover slug:X / inline-X)
   - Aspect ratio (CSS-классы или явный width/height)
   - Exact px на **desktop 2x**: рассчитать из Tailwind-классов (`w-full`, `max-w-7xl = 1280`, `aspect-video = 16:9`, и т.д.). Целевой размер нужен чтобы в промпте указать ориентацию словами
   - Приоритет (P0 hero, P1 остальные home + blog covers, P2 inline)

6. Отдельно проверить: в `FeaturedProducts` и `LatestPosts` — картинки там **переиспользуют** Placeholder от каталога/блога или свои? Если это те же самые картинки что на `/catalog` и `/blog` — записать это и **не удваивать** их в инвентаризации отчёта.

## Куда сохранить результат

Временные заметки — в `task_tracker/todo/images-audit/_findings_step1.md` (этот файл пометить как workspace, в git нужен — см. правила проекта, `task_tracker` в git). Финальная таблица уйдёт в Step 6 в отчёт.

Формат заметок:

```markdown
## Home

### Hero
- file: src/components/home/Hero.tsx:<line>
- компонент: Placeholder / bg-gradient
- изображает: главный hero
- aspect: 16:9 / 21:9 / варианты
- desktop 2x: ~2560×1440 (или точно)
- приоритет: P0

### CategoriesGrid — jackets
- file: src/components/home/CategoriesGrid.tsx:<line>
- ...

...
```

## Критерии готовности

- [ ] Прочитаны все 10 файлов из списка выше
- [ ] Выполнен grep по `Placeholder` в `src/` и `content/` — ничего не пропущено
- [ ] Создан `_findings_step1.md` с полной таблицей для home + blog
- [ ] Для каждой картинки зафиксировано: file:line, что изображает, aspect, desktop 2x px, приоритет
- [ ] Отдельно записан ответ: переиспользуют ли `FeaturedProducts` / `LatestPosts` картинки от `/catalog` и `/blog` или имеют свои
- [ ] Пометить статус в PLAN.md → done

## Verification-команды

```bash
# Grep всех упоминаний Placeholder
grep -rn "Placeholder" src/ content/ 2>/dev/null | grep -v node_modules

# Inline <img> в MDX
grep -rn "<img" content/blog/ 2>/dev/null

# bg-gradient на home/blog (если где-то мимо компонента)
grep -rn "bg-gradient" src/app/ src/components/home/ src/components/BlogCard.tsx 2>/dev/null
```
