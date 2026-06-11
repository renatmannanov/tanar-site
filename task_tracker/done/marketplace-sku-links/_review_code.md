# Review: Code

## Критичное (блокирует выполнение)

### 1. `skuInputSchema` не экспортирует `SkuInput` с новым полем — `product-mapper.ts` сломается

`src/core/catalog/repository.ts` строка 310: `export type SkuInput = z.input<typeof skuInputSchema>`.
`src/app/admin/(protected)/catalog/product-mapper.ts` строка 44: `skus: v.skus.map((sku) => ({ size, ruSize, article, priceOverride, stockQty }))` — маппер собирает SkuInput вручную, **не включая marketplaces**. После шага 1 поле появится в схеме, но маппер его не передаёт — форма при save будет слать `marketplaces: undefined` для каждого SKU, и `upsertSkus` запишет `{}` поверх того, что сохранил шаг 3.

Шаг 1 говорит "добавить `marketplaces: cleanSkuMarketplaces(sku.marketplaces)` в маппинге sku" — это правильно, но:
- функция `cleanSkuMarketplaces` в шаге 1 описана как обобщение существующей `cleanMarketplaces`, которая сейчас принимает `Product['marketplaces']` (тип `Partial<Record<Marketplace, string>> | undefined`) — та же сигнатура что и `sku.marketplaces` после добавления поля в `Sku`, так что переименование не требуется и описание это говорит. Нет проблемы, **но** маппер обращается к `sku.marketplaces`, а тип `Sku` на шаге 1 ещё не будет иметь это поле в момент чтения из БД до миграции. Порядок шагов правильный.
- Однако тип `Sku` в `src/core/catalog/types.ts` сейчас не содержит `marketplaces`. Пока шаг 1 не выполнен, TypeScript не позволит написать `sku.marketplaces` в маппере. Это нормально — шаг 1 добавляет оба. Но план должен явно зафиксировать: **маппер правится в шаге 1, не шаге 3**. В тексте шага 1 это написано (секция 4), а в шаге 3 сказано только про `ProductForm`. Нет расхождения в плане, но нет явного предупреждения, что если шаг 4 маппера пропустить — данные SKU будут молча затираться нулями при следующем сохранении формы через таб «Товар».

### 2. `OZON_URL` в существующем e2e использует `ozon.ru`, а CSV и валидатор в шаге 2 ждут `ozon.kz`

`e2e/admin-marketplaces.spec.ts` строка 11: `const OZON_URL = 'https://www.ozon.ru/product/test-456'`.
`step_2_links_import.md` описывает валидацию: "ссылка Ozon начинается с `https://ozon.kz/`".
В CSV все 109 ссылок Ozon — `ozon.kz`.

Если выполнять существующий e2e из step_3 (добавить клик `tab-marketplaces` перед `fill(mp-ozon)`), он запишет `ozon.ru`-URL в `products.marketplaces`. Проблема не блокирует шаги 1–2, но существующий тест хранит URL с другим доменом. При витринном тесте шага 4 (`href = ссылка SKU`) нужно убедиться, что тестовые URL (`product-level`, `sku-m-001`) тоже не совпадают с реальными `ozon.kz`, иначе строка географии ("другие страны — Ozon") будет ссылаться на `ozon.ru` в существующих тестах и на `ozon.kz` в новых — визуальная непоследовательность, хотя функционально не блокирует.

**Конкретно блокирует:** если план хочет обновить `OZON_URL` в существующем спеке на `ozon.kz` (для консистентности с импортом) — это нигде не описано и тест сломается на поле географии `MarketplaceLinks`, у которого `ozon.ru` не валидируется, но в CSV реальные ссылки `ozon.kz`. Стоит зафиксировать решение.

---

## Важное (стоит исправить до начала)

### 3. `mapSku` в `repository.ts` не читает `barcode` — после добавления `marketplaces` поле по-прежнему не映射ится

В schema.ts у `skus` есть поле `barcode`, в `mapSku` оно не присутствует (уже существующее расхождение). `marketplaces` добавляется аналогично. Это не баг нового плана, но стоит знать: `mapSku` намеренно не выставляет все поля схемы — так же намеренно надо добавлять только `marketplaces`.

### 4. `upsertSkus` в ветке UPDATE не читает текущий `marketplaces` из БД

Строка 378–431: SELECT возвращает только `{ id, size, stockQty }`. После шага 1 в той же функции надо добавить `marketplaces` в SET только для update-ветки. Шаг 1 об этом говорит (`marketplaces: sku.marketplaces ?? {}`). Но SELECT намеренно не расширяется — не нужен. Проблемы нет — просто убедиться что в set-объект добавлено только для UPDATE-ветки, а не INSERT (у неё `insertSkus` уже получит поле через `skuInputs`). Шаг 1 описывает правильно.

### 5. `cleanMarketplaces` в `product-mapper.ts` — сигнатура уже подходит

Текущая функция принимает `Product['marketplaces']` = `Partial<Record<Marketplace, string>> | undefined`. Тип `sku.marketplaces` после шага 1 будет `Partial<Record<Marketplace, string>> | undefined` (optional в типе `Sku`). Сигнатуры идентичны — функцию можно звать без изменений: `cleanMarketplaces(sku.marketplaces)`. Шаг 1 предлагает "обобщить сигнатуру", но фактически она уже обобщена достаточно. Переименовывать или менять тело не нужно — достаточно просто вызвать существующую. Риск: исполнитель может ненужно рефакторить функцию и сломать Product-уровень.

### 6. `EMPTY_INPUT` в `ProductForm` не содержит `marketplaces` в SKU — нормально, но надо убедиться

Строка 27–37: `EMPTY_INPUT` задаёт `skus: [{ size: '', stockQty: 0 }]` без `marketplaces`. После шага 1 `SkuInput.marketplaces` будет optional — значит пустое значение не нарушит валидацию. Нормально. `patchSkuMarketplace` из шага 3 читает `s.marketplaces` — если оно `undefined`, spread `{ ...undefined }` в JS даёт `{}`. Код в шаге 3 это учитывает: `const next = { ...s.marketplaces }`. Нет проблемы.

### 7. Тест шага 4 ищет swatch `aria-label="Чёрный"` — нужно убедиться что у sv7 есть цвет с таким label

`ProductDetail.tsx` строка 192: `aria-label={v.label}`. Шаг 4 пишет: `aria-label="Чёрный"`. В CSV строки 1–3 — куртка sv7, цвет «Чёрный». В `catalog-snapshot.json` colorLabel должен быть «Чёрный». Убедиться что `db:seed` устанавливает именно этот label — если seed-снапшот использует другое написание (например "Черный" без мягкого знака), тест упадёт. Это стоит проверить перед написанием e2e.

---

## Мелочи (можно по ходу)

### 8. `scripts/` директория — убедиться что она существует

`step_2_links_import.md` создаёт `scripts/extract-marketplace-links.ts`. В проекте уже есть `scripts/process-images.mjs` и `scripts/check-images.ts` (по `package.json`), значит директория есть. Но `check-images.ts` использует `tsx`, а `extract-marketplace-links.ts` тоже tsx — консистентно.

### 9. В шаге 2 указан путь `__dirname` в `seed-marketplace-links.ts` — корректно для `tsx`, но не для скомпилированного JS

`path.join(__dirname, 'marketplace-links.json')` — `tsx` устанавливает `__dirname` корректно. В compose-образе скрипт запускается через `npx tsx` (не скомпилирован), так что `__dirname` = реальная директория файла в builder-стадии. Паттерн идентичен `seed-site.ts` (строка 1: `import { queryClient } from './client'` — относительный), но `seed-site.ts` не читает JSON. Для JSON через `__dirname` это стандартный паттерн, работает.

### 10. В шаге 2 SQL-проверка использует jsonb-оператор `?` — в psql потребует экранирования

```
WHERE marketplaces ? 'ozon'
```
В psql через `docker exec` знак `?` в строке аргумента оболочки нужно взять в одинарные кавычки или экранировать. Команда в step_2 уже использует одинарные кавычки вокруг всего SQL-выражения — должно работать.

### 11. `step_4_storefront_links.md` импортирует `Marketplace` из `@/core/catalog/client` — правильно

`ProductDetail.tsx` уже импортирует `Product` из `@/core/catalog/client`. Добавление `Marketplace` к тому же импорту не потребует нового import-statement. Нет проблем.

---

## Не найдено проблем

- Колонка в schema.ts добавляется корректно — шаблон идентичен `products.marketplaces` (jsonb NOT NULL DEFAULT '{}').
- `z.partialRecord` в `skuInputSchema` — правильный паттерн (документировано в CLAUDE.md: zod v4 exhaustive record).
- `MarketplaceLinks.tsx` не нужно менять — уже принимает `Partial<Record<Marketplace, string>>`.
- Сидер `seed-marketplace-links` не требует `ALLOW_PROD_SEED` — правильно, он пишет только `skus.marketplaces`, не трогает catalog-таблицы в деструктивном режиме.
- `internal/` в gitignore — CSV не попадает в образ; JSON с публичными URL коммитится в `src/core/db/` — правильно.
- Все 109 Ozon-ссылок в CSV используют `ozon.kz` (не `ozon.ru`), 109 Kaspi-ссылок — `kaspi.kz`; валидация в extract-скрипте пройдёт без ошибок.
- "уточнить" в CSV — это значение в колонке «Остатки» (не в URL-колонках), не влияет на extract-логику.
- Табы через `hidden`-атрибут (не unmount) — инпуты остаются в DOM, controlled state не теряется — правильный подход.
- Строка географии на `product.marketplaces` (не `effectiveMarketplaces`) — не мигает при выборе размера, как требует шаг 4.
