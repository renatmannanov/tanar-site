# Review Summary — Полный CRUD + фото (План C)

> Дата: 2026-06-01
> Ревью: code + risks + structure (3 агента, sonnet)
> **СТАТУС: все рекомендации внесены в step-файлы 2026-06-01** (порядок 3→4→5, обновление e2e в 3/4, граница media index/store/client, Product.id в шаге 2, SELECT+diff без onConflictDoUpdate в шаге 1, sharp в deps + HEIC-проверка + MediaUploadInput в шаге 2, slug-паттерн в шаге 3, FeaturedProducts вместо CategoriesGrid + анти-N+1 в шаге 6, orphan-файлы в шаге 1, workers:1 в шаге 7).

## Критичное (блокирует / даёт неверный результат)

1. **Шаги 3 и 4 оба пишут в `actions.ts`; шаги 4 и 5 оба правят `ProductForm.tsx`** (structure #1, #2).
   Зависимость шага 4 помечена «мягкой» → автономный агент может параллелить → потеря `createProductAction` или перезапись правок формы. → **Зафиксировать жёсткий порядок 3→4→5, последовательно. Убрать «мягкая» формулировку. В шапке шага 4: «Зависит от: шаг 3 (тот же actions.ts)»; шага 5: «Зависит от: шаг 4 (та же ProductForm.tsx)».**

2. **Существующий `e2e/admin.spec.ts` сломается** (code #2, risks #6).
   Тесты проверяют, что «Создать товар»/«Удалить товар» `disabled` и видна заглушка «Загрузка фото — Доступно в Плане C». Шаги 3/4/5 их активируют → красный e2e. → **В шаги 3, 4, 5 добавить пункт «обновить соответствующие ассерты в `admin.spec.ts`».**

3. **Граница `@/core/media` → client-бандл** (code #3, risks #3, structure #4).
   Если `index.ts` реэкспортит `store.ts` (sharp/node:fs) целиком — `VariantPhotos` (client) затянет его → `build` падает (`Can't resolve 'tls/fs'`). Шаги 2/5 формулируют «реэкспорт из index» / «вынести если тянет» — двусмысленно. → **Зафиксировать ОДИН вариант: `@/core/media/index.ts` экспортирует ТОЛЬКО типы + read-функцию (`listProductImages`, server). Реализацию `store.ts` (sharp/fs) server-actions импортят НАПРЯМУЮ из `@/core/media/store`, НЕ через index. Client-компоненты импортят `MediaAsset` тип из client-safe места (создать `@/core/media/client` с типами, по аналогии с catalog/client).**

4. **`Product` read-тип не имеет `id`** (code #4).
   Шаг 6 зовёт `listProductImages(product.id)`, но в `types.ts` у `Product` нет `id` (только `slug`). → **Зафиксировать: добавить `id` в `Product`-тип + проброс в `mapProduct` (repository.ts), ЛИБО функция `listProductImagesBySlug(slug)`. Выбрать: добавить `id` в Product (чище, нужно и для будущего). Учесть в шаге 2 (сигнатура) и шаге 6.**

## Важное

5. **`onConflictDoUpdate` обнулит `reservedQty`** при upsert SKU, если агент спреднёт все колонки в `set` (risks #7, code #6).
   → **Шаг 1: явно запретить `onConflictDoUpdate` для SKU. Использовать SELECT существующих → diff → UPDATE без `reservedQty` в set / INSERT с reservedQty:0 / DELETE. Для вариантов SELECT тоже нужен (чтобы получить variantId для SKU-upsert).**

6. **`sharp` должен попасть в `dependencies`, не `devDependencies`** (code #1).
   → **Шаг 2: `npm i sharp` (НЕ `-D`). Проверить package.json после.**

7. **slug без санитизации в `createProductAction`** (risks #2).
   Zod принимает любой `min(1)`; пробелы/кириллица/спецсимволы → битый URL при `redirect`. → **Шаг 3: либо валидировать slug регуляркой (`^[a-z0-9-]+$`) в форме/zod, либо `encodeURIComponent` в redirect. Зафиксировать: добавить slug-паттерн в `productInputSchema` (`/^[a-z0-9-]+$/`).**

8. **`CategoriesGrid` — НЕ потребитель медиа** (code #5).
   Рендерит категорийные плашки с хардкод-градиентами, нет `product`-пропа. → **Шаг 6: убрать `CategoriesGrid` из списка потребителей. Оставить `ProductDetail` + `ProductCard` (+ проверить, есть ли на главной блок featured-продуктов, который реально берёт фото).**

9. **HEIC на Windows через prebuilt sharp** (risks #4).
   Prebuilt-бинарь sharp может не декодировать HEIC/HEIF. → **Шаг 2: проверить HEIC реально; если не поддержан — убрать HEIC из принимаемых форматов (оставить JPG/PNG/WEBP) и зафиксировать в progress. Не блокер — заказчица грузит чаще JPG.**

10. **`MediaUploadInput` финальная сигнатура** (structure #3, risks упоминает `slug`).
    Шаг 2 пишет «опционально уточнить», но 5/6 зависят. → **Шаг 2: зафиксировать финальную сигнатуру `MediaUploadInput` (добавить `slug: string`, `productId`, `variantId`, `alt?`) как обязательную часть шага, не «опционально».**

11. **orphan-файлы при upsert-DELETE варианта** (risks #1).
    Шаг 1 удаляет вариант (caascade media-строки), файлы в public остаются. → **Шаг 1: добавить пункт «зафиксировать orphan-файлы в progress.md» (как в шаге 4). Не чинить, но не потерять.**

12. **`afterAll: db:seed` + параллелизм Playwright** (risks #5).
    Два spec-файла с `afterAll db:seed`. → playwright.config `workers:1, fullyParallel:false` (проверено в Плане B) — гонки нет. **Подтвердить в шаге 7, что остаётся `workers:1`. Низкий приоритет.**

13. **N+1 на `/catalog` для фото** (structure #5).
    Шаг 6 не описывает, как грузить media для списка товаров. → **Шаг 6: зафиксировать — одним запросом `listProductImages` для всех продуктов категории (или JOIN), не по одному. Дать явную инструкцию против N+1.**

## Мелочи
- `deleteAction` сигнатура в ProductForm — шаг 4 даёт несколько формулировок (risks #8, structure частично). Уже есть строка «Зафиксировано: проп `deleteAction?: () => Promise<{error?}>`» — **убрать предшествующие варианты-рассуждения, оставить только финал.**

## Противоречия между ревьюерами
Нет. Находки взаимодополняющие; пересечения (client-бандл media, сломанный e2e, actions.ts/ProductForm конфликт) совпадают по сути между code/risks/structure.

## Рекомендации (по приоритету)
1. **Порядок 3→4→5 жёсткий** + правка зависимостей в шапках (крит #1).
2. **В шаги 3/4/5 — обновление `admin.spec.ts`** (крит #2).
3. **Граница media: index=типы+read, store=impl напрямую, client-типы отдельно** — зафиксировать в шагах 2 и 5 (крит #3).
4. **`Product.id`** добавить — шаги 2/6 (крит #4).
5. **Шаг 1: SELECT+diff, запретить onConflictDoUpdate; orphan в progress** (важное #5, #11).
6. **Шаг 2: sharp в deps; MediaUploadInput финальная сигнатура; HEIC-проверка** (важное #6, #10, #9).
7. **Шаг 3: slug-паттерн в zod** (важное #7).
8. **Шаг 6: убрать CategoriesGrid; против N+1** (важное #8, #13).
9. Мелочь: почистить `deleteAction`-рассуждения в шаге 4.
