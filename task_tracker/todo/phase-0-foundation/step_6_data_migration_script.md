# Шаг 6: Скрипт миграции данных src/data/products.ts → БД

> Зависит от: шаг 3 (схема), шаг 5 (типы)
> Статус: [ ] pending

## Задача

Написать idempotent-скрипт `src/core/db/seed.ts` (вызывается через `npm run db:seed`), который читает `src/data/products.ts` и наполняет БД. После выполнения в БД должны быть: все товары из `products` массива, все variants (по `variants[]` каждого товара), по одной SKU размера `OS` на variant, по одному media_asset на каждый «снимок» (lifestyle + flat) из конвенции `getProductGalleryShots`.

> **Числа динамические** — заказчица будет добавлять/убирать товары, плюс у каждого товара разное число цветов и моделей. Поэтому верификация — НЕ хардкод цифр, а сравнение «БД vs источник» (см. секцию верификации ниже). Это снимает необходимость переписывать план каждый раз когда меняется каталог.

### `package.json` scripts

Добавить:
```json
"db:seed": "tsx --env-file=.env.local -r tsconfig-paths/register src/core/db/seed.ts",
"db:reset": "tsx --env-file=.env.local -r tsconfig-paths/register src/core/db/reset.ts"
```

- `--env-file=.env.local` — tsx нативно грузит env ДО импортов (Node 24, tsx 4.21). **Обязательно:** `client.ts` читает `DATABASE_URL` в момент импорта, а `dotenv.config()` внутри скрипта срабатывает слишком поздно. Проверено в шаге 5. НЕ использовать `-r dotenv/config` с .ts-preload — ломает tsx-loader (`resolveSync not implemented`).
- `-r tsconfig-paths/register` — чтобы скрипт понимал alias `@/...`; пакет уже в devDependencies.

> **Следствие:** dotenv.config() ВНУТРИ seed.ts/reset.ts (как было написано ниже в этом шаге) больше НЕ нужен — env грузит `--env-file`. Guard на `DATABASE_URL` остаётся.

Создать `src/core/db/reset.ts` — `TRUNCATE products, product_variants, skus, media_assets, orders, order_items, inventory_log CASCADE` (для удобства re-seed в dev).

### Загрузка .env.local

Env грузится флагом `--env-file=.env.local` в npm-скрипте (см. выше), ДО любых импортов. Поэтому `dotenv.config()` внутри seed.ts/reset.ts НЕ нужен. (Причина, почему именно флаг, а не `dotenv.config()` в коде: `client.ts` читает `DATABASE_URL` в момент импорта, статические import-цепочки исполняются раньше тела скрипта — проверено в шаге 5.)

### Защита от запуска против prod БД (обязательно в обоих скриптах)

В начале seed.ts И reset.ts добавить guard ДО любых операций с БД:
```ts
const url = process.env.DATABASE_URL ?? '';
if (!/tanar_dev|tanar_test/.test(url)) {
  throw new Error(
    `DATABASE_URL must point to tanar_dev or tanar_test for seed/reset; got: ${url}`
  );
}
```

### Корректное завершение (обязательно)

Скрипты используют `postgres-js`, который держит пул коннектов открытым. Без явного закрытия Node не выходит — процесс зависает после успешного завершения работы.

В `src/core/db/client.ts` экспортировать сам queryClient рядом с `db` (он понадобится для `.end()`):
```ts
export { queryClient };   // в дополнение к existing export const db
```

В конце seed.ts и reset.ts:
```ts
import { queryClient } from './client';
// ... основная логика ...
await queryClient.end();   // ОБЯЗАТЕЛЬНО — иначе процесс зависает
```

Не использовать `process.exit(0)` (он не дожидается флаша) — `queryClient.end()` достаточно, Node выйдет сам.

### `src/core/db/seed.ts` — логика

Идемпотентность: в начале — `TRUNCATE` тех же таблиц что в reset (или вызов из reset). Это **dev-инструмент**, не прод-миграция данных. Прод-миграция будет one-off в день деплоя.

**Источник данных:** прямой `import { products } from '@/data/products'` внутри seed-скрипта. Это легально — ESLint-правило про `@/data/products` пока запрещает импорт в `app/`/`components/`, а в `src/lib/product.ts` разрешён (по текущему конфигу). Для seed.ts добавить исключение в eslint.config.mjs аналогично `lib/product.ts`:
```js
{
  files: ["src/core/db/seed.ts"],
  rules: { "no-restricted-imports": "off" },
},
```

> В Step 8 происходит переезд: `src/data/products.ts` удаляется, его содержимое мигрирует в `src/core/db/seed-data.ts`, после чего исключение для seed.ts больше не нужно и тоже удаляется. **В рамках Step 6 этого делать не нужно** — здесь работаем со схемой «seed.ts читает @/data/products».

### Алгоритм seed

Для каждого товара из `products` массива:

1. **Вставить Product:**
   ```ts
   const status = legacy.comingSoon ? 'coming_soon' : 'published';
   const [{ id: productId }] = await db.insert(schema.products).values({
     slug, name, category, status,
     priceBase: legacy.price,
     currency: legacy.currency,
     description: legacy.description,
     specs: legacy.specs,             // jsonb
     gradient: legacy.gradient ?? null,
     marketplaces: legacy.marketplaces ?? {},
   }).returning({ id: schema.products.id });
   ```

2. **Если есть variants — вставить product_variants и skus:**
   ```ts
   for (const v of legacy.variants ?? []) {
     const [{ id: variantId }] = await db.insert(schema.productVariants).values({
       productId,
       colorId: v.id,
       colorLabel: v.label,
       hex: v.hex,
       models: v.models,              // jsonb
       hasFlatShots: v.hasFlatShots ?? false,
     }).returning({ id: schema.productVariants.id });

     // Одна SKU размера 'OS' на variant
     await db.insert(schema.skus).values({
       variantId,
       size: 'OS',
       stockQty: 0,
       reservedQty: 0,
     });

     // media_assets для variant: card-md/lg, lifestyle (front/side/back × models), flat (если hasFlatShots)
     await seedMediaForVariant(productId, variantId, legacy.slug, v);
   }
   ```

3. **`seedMediaForVariant`** — генерирует URL по тем же правилам что `getProductGalleryShots`. Для каждой картинки — одна строка в `media_assets` с заполненными `scope='product', product_id, variant_id, view, model, role, url, sort_order`.

   Конкретно:
   - **Lifestyle:** для каждой пары `(view ∈ {front,side,back}, model ∈ variant.models)` одна запись с `role='lifestyle'`, `model=<model>`, `url = '/images/products/<slug>/<color>/<view>-<model>-full-lg.webp'`.
   - **Flat (только если `variant.hasFlatShots`):** для каждого `view ∈ {front,side,back}` одна запись с `role='flat'`, `model='flat'`, `url = '/images/products/<slug>/<color>/<view>-flat-full-lg.webp'`.
   - **Card-URL'ы НЕ храним в media_assets.** `getProductCardImage` остаётся синтетикой — она комбинирует slug+color+model в URL по конвенции. В media_assets — только реальные галерейные снимки.
   - URL'ы формируются через ту же функцию что в репозитории (`productImagePath` из `src/core/catalog/images.ts`), импорт явный.

   На каркасе шага 5 эти данные не используются (репозиторий не читает media_assets ещё), но заводим сразу — это рабочая модель медиа для Фазы 1.

### Маппинг полей legacy → БД

| legacy (`src/data/products.ts`) | БД таблица.поле |
|---|---|
| `slug` | `products.slug` |
| `name` | `products.name` |
| `category` | `products.category` |
| `comingSoon: true` | `products.status = 'coming_soon'` |
| `(no comingSoon)` | `products.status = 'published'` |
| `price` | `products.price_base` |
| `currency` | `products.currency` |
| `description` | `products.description` |
| `specs` | `products.specs` (jsonb) |
| `gradient` | `products.gradient` |
| `marketplaces` | `products.marketplaces` (jsonb) |
| `variants[i].id` | `product_variants.color_id` |
| `variants[i].label` | `product_variants.color_label` |
| `variants[i].hex` | `product_variants.hex` |
| `variants[i].models` | `product_variants.models` (jsonb) |
| `variants[i].hasFlatShots` | `product_variants.has_flat_shots` |
| **(generated)** | `skus`: size='OS', stockQty=0, reservedQty=0 |
| **(from images.ts)** | `media_assets`: gallery shots (lifestyle + flat) |

### Smoke-проверка скрипта (динамическая, без хардкода чисел)

В конце `seed.ts` после успешного INSERT'а вычислить ожидаемые числа **прямо из массива `legacy.products`** и сверить с фактическими COUNT'ами из БД. Если расходится — `throw new Error('seed mismatch: ...')`.

```ts
// в конце seed.ts, после insert'ов:
const expected = {
  products: legacyProducts.length,
  published: legacyProducts.filter(p => !p.comingSoon).length,
  comingSoon: legacyProducts.filter(p => p.comingSoon).length,
  variants: legacyProducts.reduce((s, p) => s + (p.variants?.length ?? 0), 0),
  skus: legacyProducts.reduce((s, p) => s + (p.variants?.length ?? 0), 0),  // одна OS на variant
  mediaAssets: legacyProducts.reduce((s, p) => {
    if (!p.variants) return s;
    return s + p.variants.reduce((vs, v) => {
      const lifestyle = v.models.length * 3;        // 3 view × N моделей
      const flat = v.hasFlatShots ? 3 : 0;
      return vs + lifestyle + flat;
    }, 0);
  }, 0),
};

const actual = {
  products: await db.$count(schema.products),
  published: await db.$count(schema.products, eq(schema.products.status, 'published')),
  comingSoon: await db.$count(schema.products, eq(schema.products.status, 'coming_soon')),
  variants: await db.$count(schema.productVariants),
  skus: await db.$count(schema.skus),
  mediaAssets: await db.$count(schema.mediaAssets),
};

for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
  if (actual[key] !== expected[key]) {
    throw new Error(`seed mismatch [${key}]: expected ${expected[key]}, actual ${actual[key]}`);
  }
}
console.log('seed OK:', actual);
```

(`db.$count` — встроенный в Drizzle helper. Если в текущей версии его нет — заменить на `db.select({ c: sql<number>\`count(*)\`::int }).from(...)`).

Это даёт два свойства:
1. **Никаких хардкод-чисел** — если завтра заказчица добавит товар, скрипт пересчитает.
2. **Самопроверка** — seed валится с понятной ошибкой если что-то реально не доехало (например в media_assets вставили 2 вместо 3 строк на view).

## Тесты

- E2e ещё не переключены (это шаг 7) → запуск e2e на этом этапе не информативен.
- Smoke — через `psql` после `db:seed`.

## Команды для верификации (PowerShell)

```powershell
# Предусловие: .env.local с DATABASE_URL (dev) существует — drizzle-kit и tsx-скрипты читают его.
npm run db:up
npm run db:migrate
npm run db:seed                              # сам выводит "seed OK: {...}" с фактическими числами, или падает с mismatch-ошибкой
# Идемпотентность — повторный запуск тоже должен напечатать "seed OK" с теми же числами:
npm run db:seed
# Опциональная ручная проверка что таблицы непустые:
docker exec -i tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT COUNT(*) FROM products"   # > 0
docker exec -i tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT COUNT(*) FROM skus"        # > 0
```

## Критерии готовности

- [ ] `src/core/db/seed.ts` и `src/core/db/reset.ts` созданы
- [ ] npm-скрипты `db:seed`/`db:reset` содержат `tsx --env-file=.env.local -r tsconfig-paths/register ...` (env грузится флагом, не кодом)
- [ ] Оба скрипта в начале проверяют что `DATABASE_URL` указывает на БД с именем `tanar_dev` или `tanar_test`, иначе throw (защита от случайного запуска против prod)
- [ ] Оба скрипта в конце явно закрывают соединение (`await queryClient.end()`) — процесс выходит с exit code 0, не зависает
- [ ] `package.json` имеет `db:seed`, `db:reset`
- [ ] `eslint.config.mjs` имеет исключение для `src/core/db/seed.ts` (разрешён импорт `@/data/products`)
- [ ] `npm run db:seed` отрабатывает без ошибок, печатает `seed OK: {...}` с фактическими числами
- [ ] Семantic-проверка внутри seed.ts: фактические COUNT'ы в БД совпадают с вычисленными из массива `products` (без хардкода чисел в плане)
- [ ] Повторный `npm run db:seed` даёт ту же картину (идемпотентность через TRUNCATE в начале)
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(db): seed script migrating products.ts to db`
