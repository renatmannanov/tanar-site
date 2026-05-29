# Шаг 3: Полный write-контракт repository (create/update/delete)

> Зависит от: шаг 2
> Статус: [ ] pending

## Задача

Добавить в `src/core/catalog/repository.ts` **полный write-контракт** — единственный путь записи каталога. Это фундамент под Планы B/C; импорт-скрипт (шаг 5) — первый потребитель.

### Методы (сигнатуры)

```ts
// Вход — доменная форма (без id; id генерит БД). Возвращает slug или полный Product.
export async function createProduct(input: ProductInput): Promise<Product>;
export async function updateProduct(slug: string, input: ProductInput): Promise<Product>;
export async function deleteProduct(slug: string): Promise<void>;
```

Где `ProductInput` — товар целиком с вложенными вариантами и SKU:
```ts
type SkuInput = { size: string; ruSize?: string; article?: string;
                  priceOverride?: number; stockQty?: number };
type VariantInput = { colorId: string; colorLabel: string; hex: string;
                      models?: ProductImageModel[]; hasFlatShots?: boolean; skus: SkuInput[] };
type ProductInput = { slug: string; name: string; category: ProductCategory;
                      status?: ProductStatus; priceBase: number; currency?: 'KZT';
                      description: string; specs?: {label;value}[]; gradient?: string;
                      label?: { badge: string; sub: string }; care?: string;
                      marketplaces?: Partial<Record<Marketplace,string>>;
                      variants: VariantInput[] };
```

> **Имя поля цены во входе — `priceBase`** (как в БД/снапшоте), хотя доменный read-тип `Product` отдаёт `price`. Это сознательно: вход = форма записи (ближе к БД), выход = доменная проекция. Mapper read-слоя уже кладёт `priceBase → price`.

### Реализация

1. **Поставить zod ПЕРВЫМ действием:** `npm i zod` (до написания кода схемы — иначе импорт не резолвится).
2. **zod-схема** `productInputSchema` валидирует `ProductInput` (slug непустой, priceBase >= 0, variants непустой массив, каждый variant имеет >=1 sku, size непустой).
   - **`care` и опциональные строки — `.nullable().optional()`**, НЕ просто `.optional()`. Снапшот содержит `care: null` у 7 товаров; `z.string().optional()` не примет `null` → ZodError на первом же товаре. Применить `.nullable().optional()` к `care` (и к любому полю, которое в снапшоте может быть `null`).
   - При маппинге в БД: `null` → пишем `null` (колонки nullable). Доменный read-тип отдаёт `undefined` (mapper: `row.care ?? undefined`).
3. **createProduct** — в транзакции (`db.transaction(async (tx) => {...})`):
   - insert products → returning id;
   - для каждого variant: insert product_variants (productId) → id;
   - для каждого sku: insert skus (variantId, size, ru_size, article, stockQty ?? 0, reservedQty 0).
   - вернуть `getProductBySlug(slug)` (или собрать из вставленного).
4. **updateProduct** — в транзакции: найти product по slug (404 если нет → throw), обновить поля products; **вложенные variants/skus — заменить целиком** (удалить старые variants каскадом, вставить новые из input). Это простая и предсказуемая модель для Плана B (форма шлёт товар целиком). Зафиксировать как единственный подход — без diff/merge.
5. **deleteProduct** — найти по slug (404 → throw), `db.delete(products).where(slug)` (variants/skus/media_assets уходят каскадом — FK onDelete cascade уже есть).
6. Экспортировать из `repository.ts` (попадут в `index.ts` через `export *`). **НЕ добавлять в `client.ts`** (write — только server).
7. Mapper'ы чтения дополнить новыми полями: `mapProduct` → `label`, `care`; `mapSku` → `article`, `ruSize`. (read-слой должен возвращать новые поля.)

### Граница
- Write-методы используют `db`/`schema` из `@/core/db` (уже импортируется). Транзакция через `db.transaction`.
- zod импортируется напрямую (внешняя зависимость, не модуль проекта).

## Тесты
- Unit-тестов нет (в бэклоге). Контракт проверяется в шаге 5 импортом боевых данных + в e2e (витрина читает созданное).
- Здесь — только `typecheck` + ручная проверка create через мини-скрипт (опционально) ИЛИ доверяем шагу 5.

## Команды для верификации

```powershell
npm i zod
npm run typecheck            # сигнатуры и zod компилируются
npm run lint                 # границы соблюдены, client.ts без write
```

Проверка экспорта:
```powershell
# Grep: pattern "createProduct|updateProduct|deleteProduct" в src/core/catalog/repository.ts → 3 export
# Grep: тех же имён в src/core/catalog/client.ts → 0 (write не в client)
```

## Критерии готовности

- [ ] `zod` в dependencies
- [ ] `repository.ts` экспортит createProduct, updateProduct, deleteProduct
- [ ] `ProductInput`/`VariantInput`/`SkuInput` типы заданы; zod-схема валидирует
- [ ] create/update — в транзакции; update заменяет variants/skus целиком; delete — каскад
- [ ] mapProduct/mapSku возвращают label/care/article/ruSize
- [ ] write-методов НЕТ в client.ts
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(catalog): full write contract (create/update/delete) with zod + transactions`
