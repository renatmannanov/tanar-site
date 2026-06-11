# Review: Risks

## Критичное (только [CONFIRMED] и [LIKELY])

### 1. upsertSkus не добавит marketplaces в SET — поле будет молча проигнорировано [CONFIRMED]

**Шаг 1**, `src/core/catalog/repository.ts`, строки 395–413.

`upsertSkus` делает явный `tx.update(schema.skus).set({ ruSize, article, priceOverride, stockQty, updatedAt })`. Колонка `marketplaces` в этом `.set({…})` НЕ перечислена. После шага 1 в схеме она появится, но существующие SKU никогда не получат обновление через форму товара — UPDATE будет тихо пропускать поле.

Шаг 1 требует добавить `marketplaces: sku.marketplaces ?? {}` в этот `set({})`-блок (step_1 это описывает), но plan явно предупреждает «не сломать reservedQty» — агент может отвлечься на это предупреждение и пропустить добавление `marketplaces`. Строчка про `reservedQty` в progress.md: «НЕ добавлять его в set» — звучит похоже, что агент должен не трогать set, хотя речь только о `reservedQty`.

**Риск:** форма администратора сохраняет sku-ссылки, typecheck проходит, но в БД ничего не пишется. Обнаруживается только e2e в шаге 3 («reopen показывает значение»), но к тому моменту уже потрачено время на отладку.

---

### 2. afterAll db:seed затирает sku.marketplaces после шага 2 и перед полным прогоном e2e [CONFIRMED]

**Шаг 2 и шаг 3**, `e2e/admin-marketplaces.spec.ts`, строка 34: `execSync('npm run db:seed')` в `afterAll`.

progress.md прямо предупреждает: «admin.spec и admin-marketplaces.spec в afterAll гоняют `npm run db:seed` → ВСЕ таблицы перезаливаются (включая sku.marketplaces — после полного прогона перезапустить `db:seed-mp-links`)».

Это означает, что `npm run test:e2e` (все спеки вместе) даёт неопределённый порядок: если admin-marketplaces.spec запустится ДО новых per-sku e2e из шага 3/4, afterAll сотрёт ссылки. Критерий готовности («npm run test:e2e — все зелёные») может фалситься при определённом порядке выполнения спек.

Шаг 2 описывает верификационную команду `db:seed-mp-links` как ручной шаг, но план не требует перезапустить её после `db:seed` внутри CI/test:e2e pipeline.

---

## Важное (только [CONFIRMED] и [LIKELY])

### 3. Тип Sku не содержит marketplaces — step_4 использует несуществующее поле [CONFIRMED]

**Шаг 4**, `src/core/catalog/types.ts`, строки 9–18. Тип `Sku` не включает поле `marketplaces`. Шаг 4 обращается к `selectedSku?.marketplaces` в `ProductDetail.tsx`.

Шаг 1 явно говорит: добавить `marketplaces?: Partial<Record<Marketplace, string>>` в `Sku`. Если агент добавит поле только в `skuInputSchema` (write), но забудет добавить его в read-тип `Sku` — typecheck упадёт на шаге 4. Это recoverable, но замедляет работу.

---

### 4. product-mapper не передаёт sku.marketplaces → при сохранении через форму ссылки будут затёрты пустым объектом [CONFIRMED]

**Шаг 1**, `src/app/admin/(protected)/catalog/product-mapper.ts`, строки 44–50.

`productToInput` маппит `v.skus.map((sku) => ({ size, ruSize, article, priceOverride, stockQty }))` — поле `marketplaces` не включено. Если агент добавит `marketplaces` в тип `Sku` и в `mapSku`, но не обновит `product-mapper.ts`, то при каждом `updateProduct` через форму sku-ссылки будут писаться как `{}` (потому что `sku.marketplaces ?? {}`), стирая всё что было (в т.ч. заполненное сидером).

Step_1 говорит добавить в mapper `cleanSkuMarketplaces(sku.marketplaces)`, но файл `product-mapper.ts` не упомянут явно в списке «что трогаем» — он описан в задаче, но агент может пропустить при реализации, т.к. это admin-слой, а не core.

---

### 5. CSV-парсер: «иначе — бросить ошибку» для 10 артикулов «уточнить» конфликтует с EXPECTED_COUNT=109 [CONFIRMED]

**Шаг 2**, `scripts/extract-marketplace-links.ts`.

PLAN.md (строка 34): «10 артикулов 'уточнить' из подвала CSV — импортируем как есть (решение 2026-06-11)». Но step_2 требует: ссылка Ozon начинается с `https://ozon.kz/`, Kaspi — с `https://kaspi.kz/`; иначе — бросить ошибку.

Неизвестно, как выглядят ссылки этих 10 «уточнить»-артикулов. Если они содержат ссылки, отличные от шаблона (или пустые), скрипт упадёт при валидации, хотя plan говорит «импортируем как есть».

Агент-исполнитель увидит противоречие: step_2 говорит «бросить ошибку», PLAN.md говорит «импортируем как есть» — поведение зависит от того, какой файл агент прочитает последним.

---

### 6. Деплой-шаг 5: tools-образ seed-marketplace-links требует явной сборки с --no-cache, иначе старый JSON [LIKELY]

**PLAN.md, строка 98–100** и progress.md.

Деплой-порядок в PLAN.md описывает `--profile tools build --no-cache seed-marketplace-links`. Если оператор пропустит явную пересборку tools-образа (по аналогии с уже известной грабли из progress.md), `marketplace-links.json` в образе будет из предыдущего билда. Для первого деплоя это не проблема (образ новый), но при обновлении JSON без изменений кода — реальный риск.

---

## Мелочи

### 7. `hidden`-атрибут на form-панелях: inert-поведение браузеров неоднородно [THEORETICAL]

В части старых браузеров `hidden` не скрывает элемент от tab-navigation, а инпуты внутри hidden-панели могут участвовать в form submission по-разному. На целевой аудитории (Казахстан) преобладает Chrome/mobile — практически не воспроизводится, но теоретически возможно.

---

## Не найдено проблем

- Аддитивность миграции 0006 — только `ALTER TABLE skus ADD COLUMN`, без DROP. Безопасно на проде.
- Idempotency сидера — логика `UPDATE … WHERE article = $article` безопасна при повторных запусках.
- Client/server barrel boundary — шаги явно указывают импорты из `/client`; `MarketplaceLinks` уже принимает произвольную мапу без изменений.
- `z.partialRecord` — уже используется в productInputSchema (строка 306 repository.ts); паттерн задокументирован и повторяется для skuInputSchema.
- Сохранность `reservedQty` в `upsertSkus` — оно явно не в SET-блоке UPDATE, и шаги явно указывают не добавлять его.
