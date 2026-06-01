# Шаг 5: Фото-блок в ProductForm (upload/remove/reorder + слот генератора)

> Зависит от: шаг 2 (MediaStore) И **шаг 4** (та же `ProductForm.tsx` — выполнять ПОСЛЕ шага 4, НЕ параллельно; здесь добавляются пропы, не перезаписывается).
> Статус: [x] done

## Задача

Заменить заглушку «Загрузка фото — Доступно в Плане C» на рабочий фото-блок В КАЖДОМ варианте-цвете. Фото пишутся СРАЗУ (отдельные server actions через FormData), независимо от controlled-формы товара.

### Server actions фото — `src/app/admin/(protected)/catalog/media-actions.ts` (`'use server'`)
- `uploadVariantImageAction(formData: FormData): Promise<{ error?: string }>`:
  - `await requireAdmin()`. Читать `file` (File), `slug`, `productId`, `variantId`, `colorLabel`, `productName` из formData.
  - `const buf = new Uint8Array(await file.arrayBuffer())` → `mediaStore.upload(buf, { scope:'product', slug, productId, variantId, alt })`.
  - `revalidatePath` edit-страницы. Вернуть `{}` или `{error}`. **БЕЗ redirect** (остаёмся на форме).
- `removeVariantImageAction(id, slug): Promise<{error?}>`: `requireAdmin` → `mediaStore.remove(id)` → revalidate.
- `reorderVariantImagesAction(items, slug): Promise<{error?}>`: `requireAdmin` → `mediaStore.reorder(items)` → revalidate.

> upload — через `FormData` с `File`: controlled `ProductForm`-state не хранит файлы. Картинки живут в БД/диске сразу.

### Фото-данные на edit-странице
- Edit-page (`[slug]/edit/page.tsx`) грузит `listProductImages(product.id)` (из `@/core/media`) и передаёт в `ProductForm` проп `imagesByVariantId: Record<string, MediaAsset[]>` (сгруппировать по variantId). На create — не передаётся (фото-блок покажет заглушку).
- **Важно:** `MediaAsset` тип импортить из `@/core/media` (типовой импорт ок). Сам компонент — client; media-actions — server; передаём данные пропом + bound server actions.

### Компонент фото-блока — `src/components/admin/VariantPhotos.tsx` (`'use client'`)
- Пропы: `{ slug, productId, productName, variant: {id, colorLabel}, images: MediaAsset[], uploadAction, removeAction, reorderAction }`.
- **mode create (нет productId/variantId):** показать «Сначала сохраните товар — затем появится загрузка фото». Ничего больше.
- **mode edit:**
  - Подсказка над сеткой: «Рекомендуем 4–6 фото: спереди, сзади, деталь, на модели».
  - Сетка превью (`<img src=url object-cover>`). Первое (sortOrder min) — бейдж «Главное».
  - Кнопка/зона «Добавить фото» (`<input type="file" accept="image/*">`) → формирует FormData (file + slug + productId + variantId + colorLabel + productName) → `uploadAction` в `useTransition`; после — `router.refresh()` (или revalidate уже обновит при навигации; для немедленного превью — refresh).
  - Каждое превью: «×» → `ConfirmButton` («Удалить фото?») → `removeAction(id, slug)`.
  - **Reorder:** drag-and-drop превью. Без тяжёлых либ — нативный HTML5 drag (`draggable`, `onDragStart/onDragOver/onDrop`) ИЛИ кнопки «←/→» для перемещения. **Зафиксировано:** кнопки «←»/«→» на каждом превью (проще и надёжнее DnD, особенно для заказчицы; меняют локальный порядок → `reorderAction(items)`). DnD — можно улучшить позже.
  - **Мягкие лимиты:** `images.length < 3` → подсветка-подсказка «маловато (минимум 3)»; `images.length >= 8` → кнопка «Добавить» disabled + «достаточно (макс 8)».
  - **Слот генератора:** кнопка «✨ Сгенерировать на белом фоне» — видимая, `disabled`, тултип «Скоро». НЕ вызывает ничего.

### Интеграция в `ProductForm`
- В блоке каждого варианта вместо старой заглушки рендерить `<VariantPhotos ... />`.
- `ProductForm` принимает новые опц. пропы: `imagesByVariantId?`, `mediaActions?: { upload, remove, reorder }` (bound на edit). На create — не передаются.
- **ВАЖНО (грабли Плана B), зафиксировано без развилок:** `VariantPhotos` и `ProductForm` — client. Импорт типов:
  - доменные типы товара (`ProductInput` и т.п.) — из `@/core/catalog/client`;
  - тип `MediaAsset` — из **`@/core/media/client`** (создаётся в шаге 2: client-safe типы, БЕЗ sharp/node:fs). НЕ из `@/core/media` (index тянет server-код).
  - server-actions фото (этот шаг) импортят реализацию из `@/core/media/store` напрямую.
  **После — обязательно `npm run build`** (typecheck/lint не ловят утечку postgres/sharp/fs в client-бандл).

## Тесты
- e2e upload/remove/reorder — шаг 7 (фикстура-картинка в `e2e/fixtures/`).

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
npm run build   # КРИТИЧНО: client не тянет sharp/fs/postgres
npm run dev
# вручную: edit товара → в цвете добавить фото (выбрать картинку) → превью появилось сразу, файл в public/, строка в media_assets
# добавить второе → стрелками поменять порядок → «Главное» переехало
# удалить фото → подтвердить → исчезло
```

## Критерии готовности
- [ ] `media-actions.ts`: upload (FormData+File) / remove / reorder, все с `requireAdmin`, БЕЗ redirect
- [ ] `VariantPhotos`: на create — «сначала сохраните»; на edit — сетка, добавить, удалить (ConfirmButton), reorder (←/→), «Главное» на первом
- [ ] Мягкие лимиты: <3 подсветка, ≥8 «Добавить» disabled
- [ ] Слот «Сгенерировать на белом фоне» виден и disabled
- [ ] Загрузка пишет файл+строку СРАЗУ (без submit формы); превью обновляется
- [ ] `npm run build` проходит (НЕТ sharp/fs/postgres в client-бандле)
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(admin): variant photo management (upload/remove/reorder) + generator slot`
