# Шаг 9: Обновить CLAUDE.md проекта

> Зависит от: шаг 8 (новая архитектура реально на месте)
> Статус: [ ] pending

## Задача

Привести `c:\Users\renat\projects\tanar-site\CLAUDE.md` в соответствие с новой реальностью Фазы 0. Старое правило «никакого бэкенда, никакой БД» отменяется — оно было верно для v1-витрины, не для целевой архитектуры.

### Конкретные правки в CLAUDE.md

#### Секция «Стек»

Заменить строку:
```
Никакого бэкенда, никакой БД. Данные — локальные TS-файлы. Контент блога — `.mdx` в `content/blog/`.
```

На:
```
- **Postgres + Drizzle ORM** — каталог, остатки, заказы, медиа. Локально через Docker (`npm run db:up`).
- **drizzle-kit** для миграций (`npm run db:migrate`).
- Контент блога — `.mdx` в `content/blog/` (без БД, отдельно от каталога — будет переехать в Фазе 6).
- Все функции каталога — **async** (читают из БД).
```

#### Секция «Commands»

Добавить блок про БД (после существующих npm-команд):
```
## Database (Postgres via Docker)

npm run db:up         # поднять postgres-dev (5432) + postgres-test (5433)
npm run db:down       # остановить
npm run db:migrate    # применить миграции drizzle-kit к dev-БД
npm run db:generate   # сгенерировать SQL после изменения src/core/db/schema.ts
npm run db:seed       # наполнить БД тестовыми товарами (dev-инструмент)
npm run db:reset      # очистить все таблицы
```

#### Секция «Структура сайта» / новая секция «Архитектура»

После «Структура сайта (v1)» добавить:
```
## Модульная структура (modular monolith, начало)

src/
  core/                ← доменное ядро, не зависит от marketplace/
    catalog/           каталог: Product/Variant/Sku, async-репозиторий
    inventory/         (заглушка, Фаза 2)
    orders/            (заглушка, Фаза 3)
    media/             (заглушка, Фаза 1 для admin-загрузки)
    db/                Drizzle: schema, client, migrations, seed
    contracts/         общие union-типы домена (ProductCategory, OrderSource, ...)
  marketplace/         ← (Фаза 5) Kaspi/Ozon/WB как подключаемые модули
    contract/          MarketplaceModule интерфейс
  app/                 Next.js App Router (витрина сейчас; (admin) — Фаза 1)
  components/, lib/    UI и общие утилиты (lib/blog, lib/gradients остались)

Границы модулей: импорт ТОЛЬКО через `index.ts` каждого модуля.
ESLint правила в eslint.config.mjs запрещают:
- импорт внутренностей модуля минуя index.ts;
- импорт `@/marketplace/*` из `@/core/*` (обратная зависимость).
```

#### Секция «Данные (v1)»

Заменить:
```
- **Продукты**: ~20–30 шт в 4 категориях — `src/data/products.ts` (типизированный массив)
```

На:
```
- **Продукты**: хранятся в Postgres (`products`, `product_variants`, `skus`). Доступ через `@/core/catalog` (async). Seed для dev: `npm run db:seed` (источник — `src/core/db/seed-data.ts`).
```

#### Другие устаревшие места — обязательно проверить и поправить:

1. **Описание `/catalog` в «Структура сайта»**: сейчас «Куртки, рюкзаки, аксессуары и футболки». Категорий backpacks/accessories в проекте нет (есть jackets, hoodies, t-shirts, pants, shorts). Заменить на актуальные.

2. **Утверждение про отсутствие `tailwind.config.ts`** — ФАКТ УСТАНОВЛЕН (2026-05-29): файл `tailwind.config.ts` РЕАЛЬНО СУЩЕСТВУЕТ в корне и используется (тип `Config` из tailwindcss, `content`-пути, плагин `@tailwindcss/typography`; postcss.config.js подключает `tailwindcss` + `autoprefixer` — это классическая связка Tailwind **v3**). То есть стек именно v3, как и задумано, но фраза в CLAUDE.md «v4 намеренно не используем — нет `tailwind.config.ts`» содержит неверный факт (конфиг есть).

   **Правка:** в секции «Стек» строку
   ```
   - **Tailwind CSS v3** (v4 намеренно не используем — нет `tailwind.config.ts`, нестабилен для автоматизации)
   ```
   заменить на:
   ```
   - **Tailwind CSS v3** (v4 намеренно не используем — нестабилен для автоматизации). Конфиг — `tailwind.config.ts` (content-пути + плагин typography), postcss через `tailwindcss` + `autoprefixer`.
   ```
   Намерение (v3, не v4) сохраняется — убирается только ложное «нет tailwind.config.ts».

#### Секция «Правила работы с task_tracker»

Без изменений.

#### Секция «Ralph loop»

Без изменений (если будет использоваться для Фазы 1+, текущий статус про initial-build устарел — поправить путь):
```
.\ralph.ps1 -PlanFile task_tracker/todo/phase-0-foundation/PLAN.md -MaxIterations 30
```
(или обновить позже на план Фазы 1; пока — указание актуального пути).

#### Секция «Git»

Без изменений.

### НЕ менять

- Базовые принципы (модульность, dev-флоу, e2e через Playwright).
- Tailwind v3, Next.js 15, TypeScript strict — это не поменялось.

## Тесты

- N/A (документ).
- Smoke: после правок CLAUDE.md прочитать его и убедиться что все упоминания «никакой БД» / «локальные TS-файлы» убраны, новые команды и структура описаны.

## Команды для верификации

```powershell
# Грубая проверка что нет упоминаний "никакой БД" в новой версии:
Select-String -Path CLAUDE.md -Pattern "никакой БД"   # 0 совпадений
Select-String -Path CLAUDE.md -Pattern "db:up"        # хотя бы 1 совпадение
Select-String -Path CLAUDE.md -Pattern "core/catalog" # хотя бы 1 совпадение
```

## Критерии готовности

- [ ] `CLAUDE.md` обновлён согласно правкам выше
- [ ] Нет упоминаний «никакой БД» / «локальные TS-файлы» как источника каталога
- [ ] Категории на /catalog актуализированы (нет «рюкзаки», «аксессуары»)
- [ ] Фраза «нет `tailwind.config.ts`» убрана из секции «Стек» (файл реально есть, v3-стек сохранён в описании)
- [ ] Добавлены секции про БД-команды и модульную структуру
- [ ] Коммит: `docs: update CLAUDE.md for phase-0 architecture`
