# Шаг 10: Завершение Фазы 0

> Статус: done (2026-05-29)

## Чеклист

- [x] Все шаги (1–9) выполнены ([x] в PLAN.md), каждый — отдельным коммитом
- [x] Предусловие проверок: `.env.local` с `DATABASE_URL` существует, `npm run db:up && npm run db:seed` выполнены
- [x] Критерии готовности из PLAN.md проверены:
  - [x] `npm run db:up` — оба сервиса healthy
  - [x] Страницы каталога имеют `export const dynamic = 'force-dynamic'` (/, /catalog, /catalog/[slug]); `generateStaticParams` в `/catalog/[slug]` отсутствует; блог не тронут (его generateStaticParams цел)
  - [x] `npm run db:migrate` + `npm run db:seed` отрабатывают; `seed OK: {products:10, published:5, comingSoon:5, variants:13, skus:13, mediaAssets:51}` без mismatch
  - [x] `npm run typecheck` — чисто
  - [x] `npm run lint` — чисто (модульные границы соблюдены)
  - [x] `npm run build` — проходит (/, /catalog, /catalog/[slug] = ƒ Dynamic; блог = ● SSG)
  - [x] `npm run test:e2e` — 40/40 зелёные
  - [x] `src/data/products.ts`, `src/lib/product.ts` отсутствуют
  - [x] Grep `@/data/products` / `@/lib/product` по ВСЕМУ репо — 0
  - [x] CLAUDE.md обновлён
- [x] Внешний вид сайта не изменился end-to-end (40 e2e покрывают главную, /catalog, /catalog/[slug], фильтры, coming-soon бейдж, 404)
- [x] Содержимое БД: товары/variants/skus из `seed-data.ts` присутствуют; orders=0, inventory_log=0
- [x] Идемпотентность seed: повторный запуск дал те же числа
- [x] Скрипты seed/reset завершаются с exit code 0 (`queryClient.end()`)
- [x] Защита seed/reset против prod БД работает (prod-URL → throw на seed.ts:10, exit 1)
- [x] Мусор убран: нет `_smoke.ts`/`_probe*.ts`/`_migrate*`/`load-env` и т.п.
- [x] Статус в PLAN.md → done
- [x] Папка перемещена: `todo/phase-0-foundation/` → `done/phase-0-foundation/`
- [x] Память проекта обновлена (отклонения: порты 5442/5443, client-split, главная force-dynamic, check-images, env через --env-file — всё в progress.md Learnings)

## Заметки для Фазы 1 (админка-каркас + каталог)

После Фазы 0 на месте:
- Postgres с 7 таблицами + миграции через drizzle-kit.
- `src/core/catalog` — async-репозиторий с теми же сигнатурами что были (плюс async).
- `src/core/db` — клиент и схема.
- Модульные границы через ESLint.
- Seed для re-naполнения dev-БД.

Что готовится в Фазе 1:
- `src/app/(public)/` — обернуть текущие маршруты витрины (route group, не меняет URL).
- `src/app/(admin)/` — новые маршруты админки с middleware-auth.
- `src/core/catalog` дополняется write-методами (`createProduct`, `updateVariant`, `addSku`, ...).
- Загрузка медиа через UI → `src/core/media` (наполняет ту же таблицу media_assets).
- Решение: NextAuth credentials vs собственная сессия+cookie (открытый вопрос архитектурного документа).

Что отложено:
- Реальные размеры (S/M/L) — проставляет заказчица в админке.
- Остатки (stock_qty) — управление в Фазе 2.
- Корзина — Фаза 3 (использует наличие из inventory).
- МП-модули — Фаза 5.
- Контент-менеджмент (site-media, блог-редактор) — Фаза 6.
- Unit-тесты на репозитории — backlog/unit-tests-for-core.md.
