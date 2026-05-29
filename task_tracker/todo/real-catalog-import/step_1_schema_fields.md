# Шаг 1: Схема — поля label/care/article/ru_size + миграция

> Зависит от: нет
> Статус: [ ] pending

## Задача

Добавить в Drizzle-схему (`src/core/db/schema.ts`) новые поля под боевой каталог и сгенерировать миграцию.

**`products`:**
- `label` — jsonb, nullable, `.$type<{ badge: string; sub: string }>()`. Колонка `label`.
- `care` — text, nullable. Колонка `care`.

**`skus`:**
- `article` — text, nullable. Колонка `article`.
- `ruSize` — text, nullable. Колонка `ru_size`.

Все четыре — nullable (демо-данные их не имели; coming_soon и будущие товары могут не иметь). Без CHECK-констрейнтов, без индексов (артикул-поиск — План B).

Сгенерировать SQL-миграцию через `drizzle-kit generate` и применить к dev + test БД.

## Реализация

0. **Предусловие:** `npm run db:up` (Postgres dev+test должны быть подняты; между Ralph-итерациями Docker может быть остановлен).
1. В `schema.ts` в `pgTable('products', ...)` добавить `label`, `care` (рядом с `specs`/`gradient`).
2. В `pgTable('skus', ...)` добавить `article`, `ruSize` (рядом с `barcode`).
3. `npm run db:generate` — создаст новый файл `src/core/db/migrations/0001_*.sql`.
4. Проверить сгенерированный SQL глазами: только `ALTER TABLE ADD COLUMN`, без drop существующих.
5. `npm run db:migrate` — применить к dev (DATABASE_URL=tanar_dev из .env.local).
6. Применить к test-БД. **PowerShell-синтаксис** (НЕ bash; инлайн `VAR=val cmd` в PowerShell не работает). `DATABASE_TEST_URL` задан в `.env.local` (см. `.env.example`: `postgres://tanar:tanar_test_pw@localhost:5443/tanar_test`). Команда:
   ```powershell
   $env:DATABASE_URL = "postgres://tanar:tanar_test_pw@localhost:5443/tanar_test"; npx drizzle-kit migrate
   ```
   (значение взять из `.env.local` строки `DATABASE_TEST_URL`; drizzle-kit читает `DATABASE_URL`, поэтому подменяем именно его на время команды).

> Тип label в схеме — inline `{ badge: string; sub: string }`. В шаге 2 доменный тип в `catalog/types.ts` будет ссылаться на ту же форму (но НЕ импортировать из db — граница). Дублирование формы допустимо (как ProductSpec).

## Тесты
- Существующие e2e НЕ запускаем здесь (данные ещё демо, поля пустые — ничего не ломается).

## Команды для верификации

```powershell
npm run db:generate          # генерит 0001_*.sql
npm run db:migrate           # применяет к dev
npm run typecheck            # схема компилируется
```

Проверка колонок в БД (dev):
```powershell
docker exec tanar-site-postgres-dev-1 psql -U postgres -d tanar_dev -c "\d products" 
docker exec tanar-site-postgres-dev-1 psql -U postgres -d tanar_dev -c "\d skus"
```
Ожидаем: в `products` есть `label`, `care`; в `skus` есть `article`, `ru_size`.

## Критерии готовности

- [ ] `schema.ts` содержит products.label (jsonb), products.care (text), skus.article (text), skus.ruSize (ru_size, text), все nullable
- [ ] Новая миграция `0001_*.sql` сгенерирована, содержит только ADD COLUMN
- [ ] `npm run db:migrate` применил к dev без ошибок
- [ ] Миграция применена к test-БД
- [ ] `\d products` показывает label, care; `\d skus` показывает article, ru_size
- [ ] `npm run typecheck` зелёный
- [ ] Коммит: `feat(db): add label/care/article/ru_size columns for real catalog`
