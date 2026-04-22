# CLAUDE.md — tanar-site

Маркетинговый сайт казахстанского outdoor-бренда **Tanar** (каз. "встречающая рассвет"). Логотип — силуэт горы Хан Тенгри. Вдохновение: Patagonia, Arc'teryx.

## Стек

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS v3** (v4 намеренно не используем — нет `tailwind.config.ts`, нестабилен для автоматизации)
- **`@tailwindcss/typography`** установлен, но класс `prose` не применяется (типографика вручную)
- **`next-mdx-remote/rsc`** + **`gray-matter`** для блога
- **Playwright** для smoke-тестов, `reuseExistingServer: true`
- Никакого бэкенда, никакой БД. Данные — локальные TS-файлы. Контент блога — `.mdx` в `content/blog/`.

## Commands

```bash
npm install                    # установка
npm run dev                    # дев-сервер (http://localhost:3000)
npm run build                  # продакшен-билд (должен проходить)
npm run start                  # запуск прод-сборки
npm run typecheck              # tsc --noEmit
npm run lint                   # ESLint
npm run test:e2e               # Playwright smoke
```

Каждый step-файл в `task_tracker/todo/initial-build/` указывает свои verification-команды.

## Структура сайта (v1)

- `/` — главная: hero, категории, featured продукты, сторителлинг-блок, последние посты блога, footer
- `/catalog` — все товары, фильтр-чипы по категориям (jackets, backpacks, accessories, t-shirts)
- `/catalog/[slug]` — карточка товара: галерея, название, цена, описание, tech specs, кнопка "Узнать о наличии" (заглушка)
- `/blog` — листинг постов
- `/blog/[slug]` — страница поста
- Шапка (лого, навигация), футер (ссылки, соц-сети — заглушки)

## Данные (v1)

- **Продукты**: ~20–30 шт в 4 категориях — `src/data/products.ts` (типизированный массив)
- **Посты блога**: 6 файлов в `content/blog/*.mdx` с frontmatter (title, slug, date, excerpt, cover gradient)
- **Язык**: только русский
- **Картинки**: CSS-градиенты из мягкой outdoor-палитры (земляные, пыльно-синие, серо-зелёные) + текст-метка с названием товара/поста

## Дизайн

Outdoor-вайб, между Patagonia и Arc'teryx. Мягкие земляные тона, строгая типографика, много воздуха. Детали теплоты/холода докручиваются позже — не блокеры для v1.

## Правила работы с task_tracker

Стандарт из `~/.claude/CLAUDE.md`:

- Каждый план = папка в `task_tracker/todo/<название>/`
- `PLAN.md` — мастер-файл
- `step_N_name.md` ≤ 300 строк, с проверяемыми критериями (команды, не слова)
- После завершения всех шагов — папка переезжает в `task_tracker/done/`
- Текущий план: [task_tracker/todo/initial-build/PLAN.md](task_tracker/todo/initial-build/PLAN.md)

## Ralph loop

Для автономного исполнения плана используется `ralph.ps1` (адаптирован из gpx-predict).

```powershell
.\ralph.ps1 -PlanFile task_tracker/todo/initial-build/PLAN.md -MaxIterations 30
```

Критерии завершения итерации — в каждом step-файле. Критерий завершения всего loop — все шаги в PLAN.md помечены `[x]`, и Ralph выводит `<promise>COMPLETE</promise>`.

## Git

- `main` — стабильная
- `dev` — сюда коммитит Ralph
- Коммиты на английском, Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- Remote: `https://github.com/renatmannanov/tanar-site.git`
