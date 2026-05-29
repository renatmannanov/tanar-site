# Phase 0 — Foundation

> Статус: pending
> Дата: 2026-05-23
> Тип: фундаментальный рефакторинг (новый стек данных)

## Цель

Перевести источник правды каталога с `src/data/products.ts` на Postgres + Drizzle, завести структуру `src/core/*` с границами через ESLint, мигрировать **все товары** из `src/data/products.ts` в БД (живая матрица — конкретные числа считаются из массива, не хардкодятся), переключить витрину на чтение через `src/core/catalog` (async). **Внешнее поведение сайта не меняется** — все существующие e2e должны остаться зелёными.

## Архитектурные решения (зафиксированы, без альтернатив)

- **БД:** Postgres 16, через Docker.
- **ORM:** Drizzle + drizzle-kit для миграций.
- **Docker:** один `docker-compose.yml` с двумя сервисами: `postgres-dev` (host-порт **5442**, БД `tanar_dev`), `postgres-test` (host-порт **5443**, БД `tanar_test`). Внутри контейнера — 5432. Volumes для персистентности. _(Порты 5442/5443, а не 5432/5433: на хосте уже занят 5432 нативным PostgreSQL — см. progress.md Learnings.)_
- **Env:** `DATABASE_URL` (dev), `DATABASE_TEST_URL` (test). Шаблон в `.env.example`, реальные значения в `.env.local` (gitignored).
- **Структура:** `src/core/{catalog,inventory,orders,media,db,contracts}` + `src/marketplace/contract`. Каждый модуль имеет `index.ts` — публичный API. `src/marketplace/{kaspi,ozon,wildberries}` НЕ заводим в Фазе 0 (Фаза 5).
- **Границы:** ESLint `no-restricted-imports` запрещает (a) импорт внутренностей модуля минуя `index.ts`, (b) импорт `marketplace/*` из `core/*`. Алиасы `@/core/*`, `@/marketplace/*` через `tsconfig.json` paths.
- **Status товара:** `status: 'draft' | 'published' | 'archived' | 'coming_soon'`. При миграции: `comingSoon: true → 'coming_soon'`, остальные → `'published'`.
- **Размеры:** для каждого варианта (цвета) создаём ОДНУ SKU с `size = 'OS'`. Реальные размеры — в Фазе 1 через админку.
- **coming_soon товары** — те, у которых в `src/data/products.ts` стоит `comingSoon: true`. У них нет `variants` в данных, поэтому в БД создаём только Product со `status='coming_soon'`, без variants/skus/media_assets. Репозиторий возвращает для них `variants: []` (НЕ undefined — тип обязательный).
- **MediaAsset:** колонка `scope: 'product' | 'site' | 'blog'`. В Фазе 0 наполняется только `scope='product'`. URL берутся из текущих путей через `getProductCardImage`/`getProductGalleryShots` — сами файлы в `public/` НЕ трогаем.
- **Async переход:** все функции каталога становятся async. Это касается `getAllProducts`, `getProductBySlug`, `getAllProductSlugs`, `getProductsByCategory`, `getRelatedProducts` + вызывающий код (см. шаг 7).
- **Рендер каталога: dynamic (не SSG).** Решение (2026-05-29): страницы каталога (`/catalog`, `/catalog/[slug]`) переводятся на `export const dynamic = 'force-dynamic'`. Причина: целевая архитектура (Вариант А) — живая площадка с остатками и админкой; статическая генерация несовместима с рантайм-изменением данных (Фаза 1-2). `generateStaticParams` в `/catalog/[slug]` УДАЛЯЕТСЯ (при force-dynamic не нужен). Билд больше НЕ читает БД на этапе сборки. Блог (`/blog/[slug]`) остаётся на `generateStaticParams` — не трогаем. См. шаг 7.
- **Предусловие БД для build/e2e:** `npm run build`, `npm run test:e2e` и dev-сервер требуют поднятого и наполненного Postgres + наличия `.env.local` с `DATABASE_URL`. При force-dynamic билд сам по себе БД не читает, но рантайм-рендер страниц (включая e2e и `next start`) — читает. Перед `build`/`test:e2e`: `npm run db:up && npm run db:seed`. Прописано как явное предусловие в шагах 6-8.
- **`src/lib/product.ts`:** удаляется в конце Фазы 0 (НЕ остаётся ре-экспортом). Все импорты переключаются на `@/core/catalog`.
- **`src/data/products.ts`:** удаляется в конце Фазы 0. ESLint-правило про него тоже удаляется.
- **Блог:** не трогаем (Фаза 6). `src/lib/blog.ts` и `BlogCard` остаются как есть.
- **Sharp-пайплайн:** не трогаем (`scripts/process-images.mjs`, `assets/`, `public/images/`).
- **CLAUDE.md проекта:** обновляется в отдельном шаге — убирается «никакой БД», добавляются Postgres/Drizzle/docker-compose/async data layer.
- **Тесты:** только существующие Playwright e2e. Unit-тесты на репозитории — в бэклоге (`backlog/unit-tests-for-core.md`), НЕ в этом плане.

## Шаги

| # | Файл | Статус |
|---|------|--------|
| 1 | step_1_docker_postgres.md — docker-compose + два сервиса Postgres | [x] |
| 2 | step_2_drizzle_setup.md — Drizzle + drizzle-kit + клиент + env | [x] |
| 3 | step_3_db_schema.md — схема (products, variants, skus, orders, order_items, inventory_log, media_assets) + миграция | [x] |
| 4 | step_4_module_skeleton.md — структура src/core/* + контракты типов + ESLint-границы + tsconfig paths | [x] |
| 5 | step_5_catalog_repo.md — `src/core/catalog`: async-репозиторий с теми же сигнатурами что в `lib/product.ts` (плюс async) | [x] |
| 6 | step_6_data_migration_script.md — one-off скрипт `npm run db:seed`: products.ts → БД, с конвертацией status/SKU/MediaAsset | [x] |
| 7 | step_7_switch_consumers.md — переключение всех потребителей на async через `@/core/catalog` | [ ] |
| 8 | step_8_cleanup.md — удалить `src/data/products.ts`, `src/lib/product.ts`, ESLint-правило про data/products | [ ] |
| 9 | step_9_update_claude_md.md — обновить CLAUDE.md проекта (новые правила) | [ ] |
| 10 | step_10_completion.md — завершение плана | [ ] |

## Критерии готовности

- [ ] `docker compose up -d` поднимает оба сервиса, `psql` к обоим работает
- [ ] `npm run db:migrate` применяет миграции к dev-БД
- [ ] `npm run db:seed` (после step 6) печатает `seed OK: {...}` — числа продуктов/вариантов/SKU/media_assets вычислены из источника, БД соответствует
- [ ] `npm run typecheck` — без ошибок
- [ ] `npm run lint` — без ошибок (включая новые правила границ модулей)
- [ ] `npm run build` — проходит (страницы рендерятся, читая из БД на сервере)
- [ ] `npm run test:e2e` — ВСЕ зелёные, без изменений в self-tests
- [ ] `src/data/products.ts` отсутствует
- [ ] `src/lib/product.ts` отсутствует
- [ ] Grep `@/data/products` по `src/` — 0 совпадений
- [ ] Grep `@/lib/product` по `src/` — 0 совпадений
- [ ] CLAUDE.md проекта актуален (нет «никакой БД», есть про Postgres/Drizzle/Docker)
- [ ] Внешний вид сайта не изменился (главная, /catalog, /catalog/[slug], /blog, hover-состояния)
- [ ] Каждый шаг — отдельный коммит
