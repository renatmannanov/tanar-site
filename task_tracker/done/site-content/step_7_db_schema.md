# Шаг 7: Схема БД — site_settings + faq_items

> Зависит от: шаг 6 (итерация 1 закрыта)
> Статус: [ ] pending

## Задача

Таблицы для редактируемых контактов и FAQ. Drizzle, `src/core/db/schema.ts` (паттерн как `mediaAssets`). Затем миграция + seed значениями из констант итерации 1.

### Таблицы

**`site_settings`** — синглтон (одна строка). Поля (все nullable text, кроме id):
- `id uuid pk default random`
- `phone1`, `phone2`, `instagram`, `email`, `city`, `address`, `pickupInfo`, `ipName`, `bin`, `bankName`, `iban` — `text` (nullable)
- `updatedAt timestamp`

Доступ: всегда «первая строка» (или фиксированный известный id). Зафиксировать: **функция `getSiteSettings()` берёт первую строку (`limit 1`); если нет — возвращает дефолт-объект с пустыми полями**. Запись — upsert первой строки.

**`faq_items`**:
- `id uuid pk default random`
- `question text not null`
- `answer text not null`
- `sortOrder integer not null default 0`
- `createdAt timestamp`

### Модуль доступа

Создать `src/core/site/` (новый модуль ядра) ИЛИ положить в существующий — зафиксировать: **новый модуль `src/core/site/`** с `index.ts` (server: `getSiteSettings`, `listFaqItems`) + `client.ts` (типы `SiteSettings`, `FaqItem` — client-safe, для футера/форм). Граница как у `@/core/media` (barrel сервера не тащит ничего тяжёлого, но типы — в `/client`). Запись (`updateSiteSettings`, FAQ CRUD) — в `store.ts` или прямо в index (нет sharp/тяжёлого → можно в index; зафиксировать: **запись-функции в `src/core/site/index.ts`**, т.к. нет node-only зависимостей в отличие от media/sharp).

### Миграция + seed

- `npm run db:generate` после правки schema.ts → миграция `000X_*.sql`.
- `npm run db:migrate`.
- **Seed**: расширить `src/core/db/seed.ts` — заполнить `site_settings` значениями из `src/lib/site-contacts.ts` и `faq_items` из `src/lib/faq.ts` (константы итерации 1).
  - ⚠️ **`seed.ts` уже содержит `TRUNCATE products ... CASCADE` для каталога.** НОВЫЕ таблицы (`site_settings`, `faq_items`) **НЕ добавлять в этот TRUNCATE** и убедиться, что они НЕ попадают в CASCADE-цепочку от products (они не ссылаются на products — не попадут, но проверить).
  - Заполнение **идемпотентно по каждой таблице отдельно**: `site_settings` — вставить строку, ТОЛЬКО если `count(site_settings) === 0`; `faq_items` — вставить дефолтные вопросы, ТОЛЬКО если `count(faq_items) === 0`. Никакого TRUNCATE этих таблиц (предохранитель: повторный seed не сотрёт правки заказчика, сделанные через админку).

## Тесты

- Миграция применяется на чистой БД (`db:reset` → `db:migrate` → `db:seed`).
- `getSiteSettings()` возвращает строку после seed; `listFaqItems()` — непустой список.

## Команды для верификации

```powershell
npm run db:generate
npm run db:up; npm run db:migrate; npm run db:seed
npm run typecheck
npm run lint
npm run build
```

## Критерии готовности

- [ ] `site_settings` + `faq_items` в schema.ts; миграция сгенерирована и применяется на чистой БД
- [ ] Модуль `src/core/site/` (index server + client типы); `getSiteSettings`/`listFaqItems` + запись-функции
- [ ] Seed заполняет обе таблицы из констант итерации 1, ТОЛЬКО если пусто (count===0); новые таблицы НЕ в TRUNCATE каталога
- [ ] `npm run typecheck/lint/build` зелёные
- [ ] Коммит: `feat(site): site_settings + faq_items tables, core/site module, seed`
