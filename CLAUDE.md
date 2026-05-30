# CLAUDE.md — tanar-site

Маркетинговый сайт казахстанского outdoor-бренда **Tanar** (каз. "встречающая рассвет"). Логотип — силуэт горы Хан Тенгри. Вдохновение: Patagonia, Arc'teryx.

## Стек

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS v3** (v4 намеренно не используем — нестабилен для автоматизации). Конфиг — `tailwind.config.ts` (content-пути + плагин typography), postcss через `tailwindcss` + `autoprefixer`.
- **`@tailwindcss/typography`** установлен, но класс `prose` не применяется (типографика вручную)
- **`next-mdx-remote/rsc`** + **`gray-matter`** для блога
- **Playwright** для smoke-тестов, `reuseExistingServer: true`
- **Postgres + Drizzle ORM** — каталог, остатки, заказы, медиа. Локально через Docker (`npm run db:up`).
- **drizzle-kit** для миграций (`npm run db:migrate`).
- Все функции каталога — **async** (читают из БД через `@/core/catalog`).
- Контент блога — `.mdx` в `content/blog/` (без БД, отдельно от каталога — переедет в Фазе 6).

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

### Database (Postgres via Docker)

```bash
npm run db:up         # поднять postgres-dev (5442) + postgres-test (5443)
npm run db:down       # остановить
npm run db:migrate    # применить миграции drizzle-kit к dev-БД
npm run db:generate   # сгенерировать SQL после изменения src/core/db/schema.ts
npm run db:seed       # импортировать боевой каталог (dev-инструмент; источник — task_tracker/.../catalog-snapshot.json через createProduct)
npm run db:reset      # очистить все таблицы
```

> **Предусловие для `build`/`test:e2e`/dev:** `.env.local` с `DATABASE_URL` + поднятый Postgres. Хост-порты 5442/5443 (а не 5432/5433: на хосте занят нативный PostgreSQL). При force-dynamic сам `build` БД не читает, но рантайм-рендер и e2e — читают: `npm run db:up && npm run db:seed` перед ними.

Каждый step-файл в `task_tracker/` указывает свои verification-команды.

### Admin auth (Фаза 1, План B)

Однопользовательская cookie-аутентификация без БД. Env в `.env.local` (см. `.env.example`):
- `ADMIN_PASSWORD` — пароль входа.
- `ADMIN_SESSION_SECRET` — HMAC-ключ подписи cookie, **≥32 символов** (иначе throw).

`/admin/login` → подписанная httpOnly-cookie (`admin_session`, HMAC-SHA256 `{exp}`). Guard: `middleware.ts` (redirect на login) + `requireAdmin()` в защищённых страницах/actions. e2e и dev требуют этих env в окружении (Next читает `.env.local`; Playwright — через `@next/env` в `playwright.config.ts`).

## Структура сайта (v1)

- `/` — главная: hero, категории, featured продукты, сторителлинг-блок, последние посты блога, footer
- `/catalog` — все товары, фильтр-чипы по категориям (jackets, hoodies, t-shirts, pants, shorts)
- `/catalog/[slug]` — карточка товара: галерея, название, цена, описание, tech specs, кнопка "Узнать о наличии" (заглушка)
- `/blog` — листинг постов
- `/blog/[slug]` — страница поста
- Шапка (лого, навигация), футер (ссылки, соц-сети — заглушки)

## Модульная структура (modular monolith, начало — Фаза 0)

```
src/
  core/                ← доменное ядро, не зависит от marketplace/
    catalog/           каталог: Product/Variant/Sku, async-репозиторий.
                       Два входа: @/core/catalog (server, вкл. repository→БД),
                       @/core/catalog/client (client-safe: types/format/images/gradient/categories).
    inventory/         (заглушка, Фаза 2)
    orders/            (заглушка, Фаза 3)
    media/             (заглушка, Фаза 1 — admin-загрузка)
    db/                Drizzle: schema, client, migrations, seed (real-catalog import)
    contracts/         общие union-типы домена (ProductCategory, OrderSource, ...)
  marketplace/
    contract/          (Фаза 5) MarketplaceModule интерфейс
  app/                 Next.js App Router
    (public)/          витрина (Header/Footer layout): page, catalog/, blog/, icon
    admin/             админка (Фаза 1, План B): login/ (вне сайдбара),
                       (protected)/ (сайдбар-shell + requireAdmin): catalog/ edit
  components/, lib/     UI и общие утилиты (lib/blog, lib/gradients, lib/admin-auth, lib/require-admin)
  middleware.ts        guard на /admin/* (nodejs-runtime), redirect на /admin/login
```

> **Client-компоненты админки импортят `@/core/catalog/client`, НЕ `@/core/catalog`** — barrel тянет `repository.ts`→postgres в client-бандл и ломает `build` (typecheck/lint этого не ловят — гонять `build`).

Границы модулей: импорт ТОЛЬКО через публичный API (`index.ts`, либо `/client` для catalog).
ESLint (`eslint.config.mjs`) запрещает: импорт внутренностей модуля минуя index.ts; импорт `@/marketplace/*` из `@/core/*` (обратная зависимость). Внутри модуля — относительные пути.

Каталог рендерится **dynamic** (`force-dynamic` на `/`, `/catalog`, `/catalog/[slug]`) — живые данные из БД. Блог остаётся SSG.

## Данные

- **Продукты**: хранятся в Postgres (`products`, `product_variants`, `skus`). Доступ через `@/core/catalog` (async). Запись — только через write-контракт (`createProduct`/`updateProduct`/`deleteProduct`). Наполнение dev-БД: `npm run db:seed` — импорт боевого каталога (12/30/109) из `task_tracker/.../catalog-snapshot.json` через `createProduct`.
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
- Текущий план: [task_tracker/todo/phase-0-foundation/PLAN.md](task_tracker/todo/phase-0-foundation/PLAN.md)

## Ralph loop

Для автономного исполнения плана используется `ralph.ps1` (адаптирован из gpx-predict).

```powershell
.\ralph.ps1 -PlanFile task_tracker/todo/phase-0-foundation/PLAN.md -MaxIterations 30
```

Критерии завершения итерации — в каждом step-файле. Критерий завершения всего loop — все шаги в PLAN.md помечены `[x]`, и Ralph выводит `<promise>COMPLETE</promise>`.

## Git

- `main` — стабильная
- `dev` — сюда коммитит Ralph
- Коммиты на английском, Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- Remote: `https://github.com/renatmannanov/tanar-site.git`
