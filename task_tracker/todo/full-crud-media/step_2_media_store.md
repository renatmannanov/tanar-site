# Шаг 2: MediaStore impl (sharp→public→media_assets) + reorder + read media

> Зависит от: нет (можно параллельно шагу 1)
> Статус: [x] done

## Задача

Реализовать `MediaStore` для product-фото: обработка `sharp`, запись в `public/`, строки в `media_assets`. Дополнить контракт `reorder`. Дать core-функцию чтения фото варианта (для витрины, шаг 6, и админ-блока, шаг 5).

### Зависимость
```powershell
npm i sharp          # В dependencies, НЕ -D (нужен в проде/CI; npm ci --production не должен его терять)
```
Проверить после: `sharp` в `package.json` → `dependencies`.

### Границы модуля media (зафиксировано, без развилок — грабля Плана B)
- **`src/core/media/index.ts`** — server-вход: реэкспорт типов + read-функция `listProductImages` (server, читает БД). Server-actions могут импортить отсюда.
- **`src/core/media/store.ts`** — реализация `MediaStore` (sharp + node:fs + db). Импортится ТОЛЬКО server-actions НАПРЯМУЮ (`@/core/media/store`), НЕ через index, чтобы не растягивать в чужой граф.
- **`src/core/media/client.ts`** (создать) — client-safe: только типы (`MediaAsset`, `MediaUploadInput`). БЕЗ sharp/fs/db. Client-компоненты (`VariantPhotos`) импортят `MediaAsset` отсюда.
- Типы (`MediaAsset`/`MediaUploadInput`/`MediaScope`) живут в типовом модуле, реэкспортятся и в index, и в client.

### Контракт — `src/core/media/index.ts` / типы
- Добавить в `interface MediaStore`: `reorder(items: { id: string; sortOrder: number }[]): Promise<void>`.
- **Финальная сигнатура `MediaUploadInput`** (обязательная часть шага, не «опционально»): `{ scope: 'product'; slug: string; productId: string; variantId: string; alt?: string }`. `slug` нужен для пути файла.

### Реализация `src/core/media/store.ts` (+ реэкспорт из index)
- `upload(file: Uint8Array, input)`:
  - Валидация: формат входа JPG/PNG/WEBP (+ HEIC, см. ниже), размер ≤ ~10 МБ (иначе throw понятной ошибкой).
  - **HEIC:** prebuilt-бинарь `sharp` на Windows может НЕ декодировать HEIC/HEIF. Проверить tsx-тестом: `sharp(heicBuffer).webp()`. Если падает — **убрать HEIC из принимаемых форматов** (оставить JPG/PNG/WEBP) и записать в progress.md Learnings. Не блокер (заказчица чаще грузит JPG). Зафиксировать фактический набор форматов по результату проверки.
  - `sharp(file)`: `rotate()` (учесть EXIF-ориентацию), ресайз `withoutEnlargement`, макс. сторона 2000px; вывести **WEBP** в 3 ширинах: 1600/800/400 (имена: `<uuid>-1600.webp` и т.д.). НЕ кропать.
  - Путь: `public/images/products/<slug>/<uuid>-{w}.webp`. **slug нужен** — передавать в `input` (добавить `slug?: string` в `MediaUploadInput`, или принимать productId и резолвить slug). Зафиксировано: передавать `slug` в input.
  - `url` в БД — основной размер (1600) как `/images/products/<slug>/<uuid>-1600.webp`; меньшие размеры — по конвенции рядом (витрина строит srcset из url, заменяя `-1600` на `-800`/`-400`).
  - `sortOrder` нового asset = `max(existing for variant) + 1` (в конец).
  - `alt`: если не передан — авто `{productName}, {colorLabel}, фото N` (N = позиция). Можно отложить и писать пустой/базовый — зафиксировано: базовый авто-alt.
  - INSERT в `media_assets` (`scope:'product'`, `url`, `sortOrder`, `productId`, `variantId`, `role:'lifestyle'`, `alt`), вернуть `MediaAsset`.
- `remove(id)`: прочитать asset → удалить файлы (все 3 ширины) из `public/` → DELETE строки.
- `list({ scope:'product', productId })`: SELECT по productId, отсортировать по `variantId, sortOrder`.
- `reorder(items)`: для каждого UPDATE `sortOrder` (в транзакции).

### Read для витрины/админки — `src/core/media`
- **Зафиксировано:** функция `listProductImages(productId: string): Promise<MediaAsset[]>` в media (sorted by variantId, sortOrder). Группировка по variantId — на стороне потребителя. Экспорт из `@/core/media` (index).
- Для пакетной загрузки на `/catalog` (против N+1): `listProductImagesForProducts(productIds: string[]): Promise<MediaAsset[]>` — один запрос `WHERE product_id IN (...)`. Витрина-список (шаг 6) использует её.
- **`Product.id` (нужно для вызова выше):** read-тип `Product` (`src/core/catalog/types.ts`) сейчас НЕ имеет `id` (только `slug`). Добавить `id: string` в `Product` и проброс в `mapProduct` (`src/core/catalog/repository.ts` ~34: `id: row.id`). Это часть ЭТОГО шага (нужно шагам 5/6). Маппер `productToInput` (admin) `id` игнорирует — не ломается.

> **Граница модулей:** `media` импортит `db`/`schema` (как catalog). Витрина/админка импортят media ТОЛЬКО через `@/core/media` (index). Файловые операции (`node:fs`) — server-only, в client НЕ тянуть.

## Тесты
- tsx-скрипт (разовый): `upload` тестовой картинки → проверить 3 webp в `public/images/products/<slug>/` + строку в `media_assets`; `remove` → файлы и строка исчезли.
- e2e через UI — шаг 7.

## Команды для верификации
```powershell
npm i sharp
npm run typecheck
npm run lint
npm run build   # sharp — server-only, не должен попасть в client-бандл
# после tsx-теста upload:
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT id, variant_id, sort_order, url FROM media_assets WHERE scope='product' ORDER BY sort_order;"
```

## Критерии готовности
- [ ] `sharp` в `dependencies` (НЕ devDependencies); `npm run build` проходит (sharp не в client-бандле)
- [ ] Границы: `index.ts` (типы+read), `store.ts` (impl, импорт напрямую), `client.ts` (только типы) — созданы
- [ ] `MediaStore.reorder` в контракте; impl `upload/remove/list/reorder` готовы
- [ ] `MediaUploadInput` финальная сигнатура (`scope/slug/productId/variantId/alt?`)
- [ ] `upload`: вход JPG/PNG/WEBP (+HEIC если поддержан), выход 3×WEBP (1600/800/400, макс сторона 2000), файлы в `public/images/products/<slug>/`, строка в `media_assets`, `sortOrder` в конец
- [ ] HEIC проверен tsx-тестом; фактический набор форматов зафиксирован в progress
- [ ] Превышение ~10МБ или неподдерживаемый формат → понятная ошибка (не 500-стектрейс)
- [ ] `remove` удаляет все размеры-файлы + строку; `reorder` меняет sortOrder
- [ ] `listProductImages(productId)` + `listProductImagesForProducts(ids)` экспортятся из `@/core/media`
- [ ] `Product` тип получил `id`; `mapProduct` прокидывает `row.id`; typecheck зелёный
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(media): MediaStore impl (sharp pipeline → public, media_assets) + reorder`
