# Шаг 1: Колонка skus.marketplaces — схема, типы, write-контракт

> Зависит от: нет
> Статус: [x] done (build прогнан в шаге 5 — на момент шага работал dev-сервер)

## Задача

### 1. Схема (`src/core/db/schema.ts`)

В таблицу `skus` после `reservedQty` добавить (зеркально `products.marketplaces`):

```ts
// Per-SKU marketplace links (Kaspi does not group variants — every color+size
// is its own card). Product-level products.marketplaces stays as the fallback
// shown until a size is picked.
marketplaces: jsonb('marketplaces')
  .$type<Partial<Record<Marketplace, string>>>()
  .notNull()
  .default({}),
```

`npm run db:generate` → миграция `0006_*` с единственным
`ALTER TABLE "skus" ADD COLUMN "marketplaces" jsonb DEFAULT '{}'::jsonb NOT NULL`.

### 2. Read-контракт

- `src/core/catalog/types.ts`, тип `Sku`: добавить поле
  `marketplaces: Partial<Record<Marketplace, string>>` — **БЕЗ `?`**: колонка
  NOT NULL DEFAULT '{}', `mapSku` всегда заполняет, `?? {}` в читателях не
  нужен (ревью: один путь). Импорт типа `Marketplace` из `@/core/contracts`
  уже есть в файле — проверить, иначе добавить `import type`. Файл
  client-safe — db-импортов не добавлять.
- `src/core/catalog/repository.ts`, `mapSku`: `marketplaces: row.marketplaces`.

### 3. Write-контракт (`src/core/catalog/repository.ts`)

- `skuInputSchema` += строка (формулировка зеркальна product-level полю —
  partialRecord, НЕ record, см. zod-граблю в CLAUDE.md):
  ```ts
  marketplaces: z.partialRecord(z.enum(MarketplaceValues), z.string()).optional(),
  ```
- `insertSkus`: в values добавить `marketplaces: sku.marketplaces ?? {}`.
- `upsertSkus`, ветка UPDATE: в set добавить `marketplaces: sku.marketplaces ?? {}`
  (полная замена — форма источник правды; `reservedQty` по-прежнему НЕ в set).

### 4. Read→write адаптер (`src/app/admin/(protected)/catalog/product-mapper.ts`)

В маппинге sku добавить `marketplaces: cleanMarketplaces(sku.marketplaces)` —
существующая функция уже подходит по сигнатуре (`Product['marketplaces']` ==
`Partial<Record<Marketplace, string>> | undefined`), обобщать/дублировать НЕ
нужно (ревью: лишний рефакторинг).

> **⚠ КРИТИЧНО: без этого пункта каждое сохранение формы товара МОЛЧА сотрёт
> все sku-ссылки** — `upsertSkus` пишет `sku.marketplaces ?? {}` (полная
> замена), поле optional → typecheck пропуск не поймает. Регрессионный e2e —
> в шаге 3.

### 5. Что НЕ трогаем в этом шаге

UI (ProductForm, ProductDetail) — шаги 3–4. Сидер ссылок — шаг 2.
Существующий сид каталога (`catalog-snapshot.json`) поля не имеет →
`insertSkus` поставит `{}` — поведение не меняется.

## Тесты

Новых e2e нет (поле ещё нигде не отображается). Существующие должны остаться
зелёными: создание товаров через админ-UI шлёт sku без marketplaces →
`?? {}`. Прогнать admin-спеки + cart.

## Команды для верификации

```bash
npm run db:generate        # создаёт ровно 0006_*; повторный запуск — "No schema changes"
npm run db:migrate
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/admin.spec.ts e2e/admin-crud-media.spec.ts e2e/admin-marketplaces.spec.ts e2e/cart.spec.ts
```

## Критерии готовности

- [ ] Миграция 0006 — один аддитивный ALTER; `db:generate` повторно пуст
- [ ] `Sku.marketplaces` доступен в read-типе; `mapSku` его заполняет
- [ ] `createProduct`/`updateProduct` принимают и сохраняют sku.marketplaces
      (проверка: `npx tsx`-однострочник не нужен — это покроет шаг 2 импортом;
      здесь достаточно typecheck + зелёных admin-спеков)
- [ ] typecheck, lint, build, перечисленные спеки — exit 0
