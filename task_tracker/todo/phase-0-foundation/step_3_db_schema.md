# Шаг 3: Схема БД + первая миграция

> Зависит от: шаг 2
> Статус: [ ] pending

## Задача

Описать схему всех таблиц фундамента, сгенерировать первую миграцию через drizzle-kit, применить её к dev-БД. Таблицы заполняются в шаге 6 (миграция данных).

### `src/core/db/schema.ts`

Все таблицы — в одном файле (вынесение по модулям — позже). Использовать `pgTable` из `drizzle-orm/pg-core`.

#### Таблицы и поля

**`products`** — каталог.
- `id` uuid PK default `gen_random_uuid()`
- `slug` text unique not null
- `name` text not null
- `category` text not null (значения из union, валидация на уровне репозитория, не CHECK constraint — в Фазе 1 категории могут стать таблицей)
- `status` text not null default `'published'` (значения: `'draft' | 'published' | 'archived' | 'coming_soon'`)
- `price_base` integer not null default 0 (в тиынах/копейках — НЕТ. Тут KZT целое, как в текущем коде: `149_900`. Поле в integer KZT без дробей.)
- `currency` text not null default `'KZT'`
- `description` text not null
- `specs` jsonb not null default `'[]'::jsonb` (массив `{label, value}`)
- `gradient` text (опционально, представление)
- `marketplaces` jsonb default `'{}'::jsonb` (Partial<Record<Marketplace, string>>)
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

**`product_variants`** — цвет товара.
- `id` uuid PK
- `product_id` uuid not null references `products(id)` on delete cascade
- `color_id` text not null (например `'red'`, `'darkblue'`)
- `color_label` text not null
- `hex` text not null
- `models` jsonb not null default `'[]'::jsonb` (массив `'man'|'girl'`)
- `has_flat_shots` boolean not null default false
- `created_at` timestamptz not null default `now()`
- unique (`product_id`, `color_id`)

**`skus`** — единица учёта остатков (цвет × размер).
- `id` uuid PK
- `variant_id` uuid not null references `product_variants(id)` on delete cascade
- `size` text not null (в Фазе 0 — `'OS'`)
- `price_override` integer (опц., KZT)
- `barcode` text (опц.)
- `stock_qty` integer not null default 0
- `reserved_qty` integer not null default 0
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`
- unique (`variant_id`, `size`)

**`media_assets`** — все картинки сайта.
- `id` uuid PK
- `scope` text not null (`'product' | 'site' | 'blog'`)
- `url` text not null
- `sort_order` integer not null default 0
- `product_id` uuid references `products(id)` on delete cascade (опц.)
- `variant_id` uuid references `product_variants(id)` on delete cascade (опц.)
- `view` text (опц., `'front'|'side'|'back'`)
- `model` text (опц., `'man'|'girl'|'flat'`)
- `role` text (опц., `'lifestyle'|'flat'`)
- `key` text (опц., для scope=site/blog: `'home.hero'`, `'story.1'`, и т.п.)
- `alt` text (опц.)
- `created_at` timestamptz not null default `now()`

**`orders`** — заказы.
- `id` uuid PK
- `source` text not null default `'site'` (значения: `'site'|'kaspi'|'ozon'|'wb'`)
- `status` text not null default `'pending'`
- `contact` text not null default `''`
- `customer` jsonb default `'{}'::jsonb`
- `total` integer not null default 0
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

**`order_items`** — позиции заказа.
- `id` uuid PK
- `order_id` uuid not null references `orders(id)` on delete cascade
- `sku_id` uuid not null references `skus(id)`
- `name_snapshot` text not null
- `price_snapshot` integer not null
- `qty` integer not null

**`inventory_log`** — аудит движения остатков.
- `id` uuid PK
- `sku_id` uuid not null references `skus(id)`
- `delta` integer not null (положительный = приход, отрицательный = расход)
- `reason` text not null (`'sale'|'return'|'manual'|'reservation'|'reservation_release'`)
- `ref_order_id` uuid references `orders(id)` (опц.)
- `note` text (опц.)
- `created_at` timestamptz not null default `now()`

#### Типизация jsonb-столбцов (обязательно — `.$type<>()`)

Все jsonb-поля типизируются через `.$type<>()`, чтобы Drizzle давал TS-проверку на запись (seed сейчас, админка в Фазе 1) и точный тип на чтение (репозиторий, step 5) — без ручных `as`. Это НЕ CHECK-констрейнт в БД (констрейнты на jsonb-ключи громоздкие, а категории/площадки ещё будут меняться), а типизация на уровне Drizzle. Импортировать union'ы из `@/core/contracts`.

```ts
import type { Marketplace, ProductImageModel } from '@/core/contracts';

// products.specs
specs: jsonb('specs')
  .$type<{ label: string; value: string }[]>()
  .notNull()
  .default([]),

// products.marketplaces
marketplaces: jsonb('marketplaces')
  .$type<Partial<Record<Marketplace, string>>>()
  .notNull()
  .default({}),

// product_variants.models
models: jsonb('models')
  .$type<ProductImageModel[]>()
  .notNull()
  .default([]),
```

> **Зависимость:** `@/core/contracts` создаётся в step 4, а schema.ts — в step 3. На момент step 3 contracts ещё нет. **Решение:** в step 3 типы union для `.$type<>()` объявить локально inline в schema.ts (или импортом из contracts, если он уже на месте). В step 4, когда contracts заведён, schema.ts переключается на импорт из `@/core/contracts` (это часть скелета). Если порядок исполнения — 3 раньше 4, использовать inline-литералы типа `$type<('man'|'girl')[]>()`, в step 4 заменить на импорт. Зафиксировать в коммите step 4.

> **Валидация внешнего ввода** (что в jsonb не заедет мусорный ключ) в Фазе 0 НЕ делается: БД наполняется только собственным seed'ом, чужих писателей нет. Единственная точка валидации произвольного ввода — будущая админка (Фаза 1), не репозиторий чтения. `.$type<>()` даёт compile-time гарантию для нашего же кода — этого на Фазу 0 достаточно.

#### Индексы (в schema через `index(...)`)

- `products(slug)` unique уже через unique constraint
- `products(status, category)` — для фильтрации каталога
- `product_variants(product_id)` (есть через FK, но явный индекс быстрее)
- `skus(variant_id)`
- `media_assets(product_id)`, `media_assets(scope, key)`
- `orders(source, status, created_at)`

### `gen_random_uuid()`

Это функция расширения `pgcrypto`. Создать первой строкой миграции:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
Через drizzle-kit это делается ручной правкой сгенерированного SQL после `db:generate` — допишите эту строку в начало первого `*.sql` файла. Зафиксировать в коммите вместе со сгенерированным файлом.

### Привязка клиента к схеме

В `src/core/db/client.ts` после step 3 изменить экспорт:
```ts
import * as schema from './schema';
// ...
export const db = drizzle(queryClient, { schema });
```

### Команды

```powershell
npm run db:up                                  # postgres-dev должен быть запущен
npm run db:generate                            # создаёт SQL-миграцию в src/core/db/migrations/
# ВАЖНО: открыть свежий .sql и дописать в начало `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
npm run db:migrate                             # применяет к tanar_dev
```

Также применить миграции к test-БД (понадобится в будущем для unit-тестов, заодно проверяем что миграция воспроизводимая):
```powershell
$env:DATABASE_URL="postgres://tanar:tanar_test_pw@localhost:5433/tanar_test"
npm run db:migrate
$env:DATABASE_URL="postgres://tanar:tanar_dev_pw@localhost:5432/tanar_dev"   # вернуть
```

## Тесты

- Существующие e2e — не затронуты.
- Smoke через `psql`: после миграции таблицы существуют.

## Команды для верификации

```powershell
npm run typecheck                              # без ошибок (schema.ts корректен)
docker exec -i tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "\dt"
# должно показать: products, product_variants, skus, media_assets, orders, order_items, inventory_log, __drizzle_migrations
docker exec -i tanar-site-postgres-test-1 psql -U tanar -d tanar_test -c "\dt"
# то же самое
```

## Критерии готовности

- [ ] `src/core/db/schema.ts` создан со всеми 7 таблицами + индексами
- [ ] jsonb-поля (`products.specs`, `products.marketplaces`, `product_variants.models`) типизированы через `.$type<>()` (inline-типы в step 3, переключение на импорт из `@/core/contracts` — в step 4)
- [ ] `src/core/db/migrations/0000_*.sql` сгенерирован, в его НАЧАЛО (до первого CREATE TABLE) дописана строка `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- [ ] Проверка наличия строки: `Select-String -Path src\core\db\migrations\*.sql -Pattern "CREATE EXTENSION IF NOT EXISTS pgcrypto"` возвращает совпадение
- [ ] Миграция применена к `tanar_dev` И `tanar_test` без ошибок
- [ ] `\dt` показывает все 7 таблиц + `__drizzle_migrations` в обеих БД
- [ ] `db/client.ts` обновлён: `drizzle(queryClient, { schema })`
- [ ] `npm run typecheck` зелёный
- [ ] Коммит: `feat(db): initial schema (products, variants, skus, orders, media, inventory)`
