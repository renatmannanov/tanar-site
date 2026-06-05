# Шаг 5: Админка — 3 кнопки генерации фото (Gemini)

> Зависит от: Фаза A (выполнена, EXPERIMENTS.md)
> Статус: [ ] pending

## Задача

Встроить 3 проверенных сценария в админку как server actions + UI в `VariantPhotos`. Защита от дурака (превью/доступность/метка) — шаг 6; здесь — рабочий бэкенд и базовый UI кнопок.

**Сценарии (термины — для пользователя):**
- **flat** («сделать фото на белом») — живое фото варианта → товар на белом фоне, тот же ракурс. Рецепт 1.
- **recolor flat** («перекрасить фото на белом») — готовый flat одного цвета → flat в цвете другого варианта (по hex). Рецепт 2.
- **recolor lifestyle** («перекрасить живое фото») — живое фото одного цвета → тот же кадр в цвете другого варианта. Рецепт 3.

Промпты — из `internal/docs/nano-banana-recipes.md` (рецепты 1–3). Для flat side/back — вариант промпта с явным удалением частей тела.

## Доступ к Gemini (проверено 2026-06-04)

- Ключ в env `GEMINI_API_KEY` (source = env var, виден рантайму через `process.env`).
- Переменной НЕТ в `.env.example`/`.env.prod.example`, Gemini-SDK в проекте НЕТ. Поэтому:
  1. Добавить `GEMINI_API_KEY=` в `.env.example` и `.env.prod.example` (комментарий: ключ Gemini для генерации фото в админке; на проде — в `.env`).
  2. Зависимость `@google/genai` (модель `gemini-2.5-flash-image`, как в nano-banana).
  3. `generate.ts` бросает понятную ошибку при пустом ключе (как `ADMIN_SESSION_SECRET` guard).

## Архитектура (зафиксирована — переиспользуемый движок, решение 2026-06-04)

Генерация вынесена в **отдельный домен-агностик модуль `@/core/photogen`** (Buffer→Buffer, не знает про Tanar/БД/sharp/slug). Цель — переиспользовать в др. проектах копированием папки.

- **`src/core/photogen/`** — server-only модуль, публичный API через `index.ts`:
  - `provider.ts` — `interface ImageGenProvider { editImage(img: Uint8Array, prompt: string): Promise<Buffer> }`.
  - `gemini.ts` — `class GeminiProvider implements ImageGenProvider` через `@google/genai` (модель `gemini-2.5-flash-image`). Бросает понятную ошибку при пустом `GEMINI_API_KEY` (как `ADMIN_SESSION_SECRET` guard). MCP не используется (в рантайме недоступен).
  - `recipes.ts` — промпты 1–3 из `nano-banana-recipes.md`, параметризованы `view`/`hex` (side/back → промпт с удалением тела).
  - `types.ts` — `PhotoView` (`front|side|back`), типы рецептов.
  - `index.ts` — высокоуровневые функции, все возвращают `Buffer`, принимают провайдера (DI, по умолчанию `GeminiProvider`):
    - `lifestyleToFlat(srcBuf, { view })` — рецепт 1.
    - `recolorFlat(srcBuf, { hex, view })` — рецепт 2.
    - `recolorLifestyle(srcBuf, { hex })` — рецепт 3.
  - **НЕ зависит** от `@/core/media`/sharp/db — зависимость только обратная. ESLint-границы соблюдены.
- **Server actions** в `src/app/admin/(protected)/catalog/media-actions.ts` (рядом с upload, Tanar-specific «клей»): `generateFlatAction`, `recolorFlatAction`, `recolorLifestyleAction`. Каждый: `'use server'`, `requireAdmin()`, поток:
  1. читаем исходный media_asset по id → файл из `public/...` в Buffer;
  2. `generate.ts` → результат Buffer;
  3. `mediaStore.upload(buf, {...})` → UPDATE `role/model/view` **в ОДНОЙ транзакции** (upload по умолчанию ставит `role:'lifestyle'`):
     - flat → `role:'flat', model:'flat', view:<наследуется от источника>`, `hasFlatShots=true`;
     - recolor lifestyle → `role:'lifestyle', view:<источник>`;
  4. пометить, что фото сгенерировано ИИ (см. шаг 6 — поле/конвенция).
- **Метка типа при ручной загрузке (недоработка из PLAN):** дать в upload-форме выбор `lifestyle/flat` (или хотя бы action для смены role существующего фото). Иначе recolor-flat не найдёт источник, если flat залит руками.
- **`urlForWidth`** — не дублировать: импорт из `store.ts` (или `widths.ts`, если появился в prod-deploy step 9).

## UI (VariantPhotos) — проверено по факту 2026-06-04

Файл `src/components/admin/VariantPhotos.tsx` (client, импорт `@/core/media/client`). Фактическое состояние:
- Placeholder уже есть: строка ~170, `<Button disabled title="Скоро">✨ Сгенерировать на белом фоне</Button>` — оживить (flat).
- `MediaActions` (строки 12–19) сейчас: `upload`/`remove`/`reorder`. Расширить полями `generateFlat`/`recolorFlat`/`recolorLifestyle`.
- `MediaAsset` (client-тип, `types.ts`) **уже имеет `role` (`lifestyle|flat`) и `view`** — фильтрация источников возможна без правки типов. ✅
- `urlForWidth`/`srcSetFromUrl` **уже в `@/core/media/client`** (не в store) — для UI брать оттуда, НЕ дублировать.
- Сборка actions — `[slug]/edit/page.tsx` строки 52–54 (`upload/remove/reorder`). Добавить туда новые 3 функции.

**КРИТИЧНО — источник из ДРУГОГО варианта (архитектура):**
`VariantPhotos` сейчас принимает `images: MediaAsset[]` = фото ТОЛЬКО своего варианта (см. Props). Но:
- recolor flat берёт flat-источник из ДРУГОГО цвета;
- recolor lifestyle берёт lifestyle-источник из ДРУГОГО цвета.
→ Компоненту нужны фото всех вариантов товара. Добавить проп (напр. `siblingAssets: MediaAsset[]` или `productAssets`), наполняемый в `edit/page.tsx`. Без этого recolor-кнопки нечем кормить.

**КРИТИЧНО — не сломать существующие e2e** (`e2e/admin-crud-media.spec.ts`):
- file input ищется `page.locator('input[type="file"]').first()` (стр. 65, 78) → новые кнопки/инпуты НЕ добавлять `<input type=file>` ВЫШЕ существующего.
- превью считаются `page.locator('ul li')` / `ul li img` (стр. 69, 81, 104, 111) → НЕ оборачивать новый UI в `<ul><li><img>` выше галереи, иначе счётчики поедут.
- кнопка удаления — `getByRole('button', { name: '×' })` → не плодить кнопки с тем же именем.

**Лимит фото:** в компоненте есть `SOFT_MAX=8` (`atMax` блокирует загрузку). Решить: блокируют ли генерацию те же 8 (скорее да — единый лимит на вариант). Учесть в шаге 6.

## Метка role при ручной загрузке (расхождение, уточнено)

`uploadVariantImageAction` (media-actions.ts) зовёт `mediaStore.upload` БЕЗ role → `store.ts` хардкодит `role:'lifestyle'`. `onPick` в VariantPhotos шлёт фиксированный FormData (file/slug/productId/variantId).
Чтобы recolor-flat нашёл источник, нужен flat в БД. Варианты (выбрать при реализации):
- (a) добавить в форму выбор типа загружаемого фото (lifestyle/flat) + протащить через FormData → action → upload-input → store;
- (b) отдельный мелкий action «пометить это фото как flat/lifestyle» (UPDATE role) — проще, не трогает upload.
Рекомендация: (b) как минимум; (a) если останется время. Это влияет и на `MediaUploadInput` (сейчас без role) — при (a) добавить `role?`.

> Доступность кнопок (когда какая видна) и превью-апрув — шаг 6. Здесь кнопки могут быть видны всегда (черновой UX); шаг 6 наводит правила.

## Тесты

- **e2e мокает `@/core/photogen`** — не дёргать реальный Gemini (стоимость/флейки). Проверка: у варианта с lifestyle-фото нажать «flat» → action вызван, появляется flat (мок-фикстура).
- `npm run build` — client-бандл не тянет sharp/gemini (границы модулей).

## Команды для верификации

```powershell
npm run build
npm run typecheck
npm run lint
npm run test:e2e
# Ручная (реальный Gemini): /admin/catalog/<slug>/edit — flat + recolor работают
```

## Критерии готовности

- [x] `GEMINI_API_KEY` в `.env.example` + `.env.prod.example`; `GeminiProvider` кидает понятную ошибку при пустом ключе
- [x] `@google/genai` в зависимостях (`^2.8.0`)
- [x] `@/core/photogen` (server-only, домен-агностик, НЕ зависит от core/media): `ImageGenProvider`+`GeminiProvider`, рецепты, `lifestyleToFlat` + `recolorFlat` + `recolorLifestyle`
- [x] 3 server actions в media-actions.ts (requireAdmin, upload пишет role/view/model в ОДНОМ INSERT + hasFlatShots в той же транзакции, наследование view от источника)
- [x] Ручная загрузка умеет менять role существующего (`setRole` action + бейдж-переключатель «живое ↔ на белом»)
- [x] `MediaActions` расширен; `[slug]/edit/page.tsx` передаёт новые action-функции; `siblingImages` для recolor
- [x] 3 кнопки в VariantPhotos (после file input); `urlForWidth` не задублирован (взят из client)
- [x] e2e мокает photogen (PHOTOGEN_FAKE=1 → FakeProvider); `npm run build/typecheck/lint/test:e2e` зелёные (59 passed); client-бандл чист (edit 136 kB, sharp/gemini server-only)
- [ ] Ручная проверка: 3 сценария работают из админки (реальный Gemini) — требует запуска с реальным ключом + глаз пользователя
- [ ] Коммит: `feat(admin): generate product photos via Gemini (flat, recolor-flat, recolor-lifestyle)`
