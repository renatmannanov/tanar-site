# Шаг 10: Завершение Фазы 0

> Статус: pending

## Чеклист

- [ ] Все шаги (1–9) выполнены ([x] в PLAN.md), каждый — отдельным коммитом
- [ ] Предусловие проверок: `.env.local` с `DATABASE_URL` существует, `npm run db:up && npm run db:seed` выполнены (build при force-dynamic БД не читает, но e2e и `next start` — читают)
- [ ] Критерии готовности из PLAN.md проверены:
  - [ ] `npm run db:up` — оба сервиса healthy
  - [ ] Страницы каталога имеют `export const dynamic = 'force-dynamic'`; `generateStaticParams` в `/catalog/[slug]` отсутствует; блог не тронут
  - [ ] `npm run db:migrate` + `npm run db:seed` отрабатывают; seed печатает `seed OK: {...}` без mismatch
  - [ ] `npm run typecheck` — чисто
  - [ ] `npm run lint` — чисто (модульные границы соблюдены)
  - [ ] `npm run build` — проходит
  - [ ] `npm run test:e2e` — ВСЕ зелёные (db должна быть up + seeded)
  - [ ] `src/data/products.ts`, `src/lib/product.ts` отсутствуют
  - [ ] Grep `@/data/products` / `@/lib/product` по `src/` — 0
  - [ ] CLAUDE.md обновлён
- [ ] Внешний вид сайта не изменился end-to-end (главная, /catalog, /catalog/[slug], hover, фильтры)
- [ ] Содержимое БД: все товары, variants и skus из `seed-data.ts` присутствуют; orders/inventory_log пустые. Конкретные количества — производные от seed-data, сверка через сам seed-скрипт (`seed OK`).
- [ ] Идемпотентность seed: повторный запуск даёт то же состояние (TRUNCATE в начале + повторный INSERT)
- [ ] Скрипты seed/reset завершаются с exit code 0 (вызывают `queryClient.end()`)
- [ ] Защита от запуска seed/reset против prod БД работает (тест: временно подсунуть DATABASE_URL без 'tanar_dev|tanar_test' → скрипт падает с понятной ошибкой)
- [ ] Мусор убран: нет временных проб ESLint, нет закомментированного кода, нет неиспользуемых импортов, нет `_smoke.ts` / `_probe*.ts`
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `todo/phase-0-foundation/` → `done/phase-0-foundation/`
- [ ] Память проекта обновлена (если есть фактические отклонения от плана)

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
