# Progress Log — photo-pipeline (слоты)

## Контекст для агента

**Что это:** инструмент в админке, которым ЗАКАЗЧИК (не разработчик) генерирует фото товаров через Gemini (nano-banana), заменяя CSS-градиенты. UX и защита от дурака — приоритет.

**Что уже готово (шаг 5, НЕ переписывать):**
- `src/core/photogen/` — домен-агностик движок: `provider.ts` (`ImageGenProvider`), `gemini.ts` (`GeminiProvider`), `fake.ts` (для e2e), `recipes.ts` (промпты 1–3 из `internal/docs/nano-banana-recipes.md`), `index.ts` (`lifestyleToFlat`/`recolorFlat`/`recolorLifestyle`, DI провайдера).
- 3 server actions в `src/app/admin/(protected)/catalog/media-actions.ts`: `generateFlatAction`/`recolorFlatAction`/`recolorLifestyleAction` + `setVariantImageRoleAction`.
- `src/core/media/store.ts`: `upload` принимает `role/view/model`, флипает `hasFlatShots`; добавлены `get`/`readFile`/`setRole`. `MediaUploadInput` (types.ts) расширен `role/view/model`.
- UI `src/components/admin/VariantPhotos.tsx` — черновой (плоский список + 3 кнопки + бейдж-переключатель роли). **Шаги 5.1–5.3 его переделывают.**
- `GEMINI_API_KEY` в `.env.example` + `.env.prod.example`; `@google/genai` в зависимостях. Ключ — в `.env.local` (есть, проверен реальной генерацией).

**2 косяка чернового UX, которые лечат 5.1–5.3:**
1. `view` не задаётся при ручной загрузке → всегда уходит как `front` → **back-flat дорисовывает лого на спине** (нужен промпт 1.c с `view='back'`).
2. Источник генерации — «первое подходящее фото», заказчик не контролирует.

**Решения (зафиксированы с пользователем, НЕ пересматривать):**
- Ровно 6 слотов на цвет: `life_{front,side,back}` + `flat_{front,side,back}` (без гибких доп-слотов).
- recolor = **звезда** (источник = заполненный слот другого цвета; целевой = где нажал; без галочки «база»).
- Порядок на витрине: **life → потом flat**.
- Перезапись занятого слота — с подтверждением (апрув результата → апрув замены) — шаг 6.
- life грузим руками; flat — руками И генерацией.
- swap (рецепт 4) ОТКЛОНЁН; генерация-с-нуля по тексту НЕ делаем.

## Технические факты (проверены, не гадать)

- `@/core/photogen` домен-агностик — НЕ импортит `core/media`. ESLint-границы: импорт модуля только через index.ts (`@/core/*/*` запрещён, кроме `/client` и `@/core/media/store`).
- **Client-компоненты импортят `@/core/media/client`** (НЕ barrel `@/core/media` — тянет sharp, ломает build). `slotOf`/`PHOTO_SLOTS`/hex-distance — класть в `client.ts` (рядом с `urlForWidth`/`srcSetFromUrl`).
- `media_assets` поля: `role` (`lifestyle|flat`), `view` (`front|side|back`), `model`, `variantId`. Схему НЕ менять до шага 6 (там `ai_generated` через миграцию drizzle).
- **e2e** (`e2e/admin-crud-media.spec.ts`): file input `.first()`; превью считаются `ul li` / `ul li img`; кнопка удаления name `×`. Превью генерации (шаг 6) рендерить ВНЕ `<ul>`. Мок Gemini: `PHOTOGEN_FAKE=1` (в `playwright.config.ts` → `webServer.env`) → `FakeProvider` (echo source bytes).
- Реальная проверка Gemini требует `.env.local` с `GEMINI_API_KEY` + поднятый Postgres (5442/5443) + `db:seed`. Модель `gemini-2.5-flash-image`. **Каждый вызов платный** — реальные прогоны только по запросу пользователя.
- Прод-заливка фото — отдельный план (prod-deploy step 9). Этот план фото на прод НЕ заливает.

## Learnings
(заполняется в процессе работы)

---
- 2026-06-05: Реальный Gemini подтвердил 3 рецепта на `jacket-sv7-goretex` (front-flat/recolor-flat/recolor-lifestyle ок). Косяк: back-flat дорисовывает лого — корень в `view=null`. Тестовые данные (БД media_assets + 9 файлов на диске + scratch) убраны.
- 2026-06-05 (шаг 5.1 done): сетка 6 слотов в `VariantPhotos`. Слот-хелперы (`PhotoSlotKey`/`PHOTO_SLOTS`/`slotOf`/`assetsBySlot`/`assetsOutsideGrid`) — в `@/core/media/client` (client-safe). Загрузка пишет `role`+`view` из кликнутого слота (FormData → `uploadVariantImageAction`). Стрелки ←/→ убраны; `reorder` action/store оставлены мёртвыми. Витрина сортируется life→flat, front→side→back (`sortBySlot` в `index.ts`, синхронен с `PHOTO_SLOTS`). Блок «вне сетки» для `slotOf===null` (legacy view=null) — показывается только если есть. Бэкенд-страховка `mediaStore.slotTaken` (отклоняет запись в занятый слот) — добавлена уже здесь (план относил к 5.2, но upload-путь её требует). e2e переписан под слоты (filechooser по `title="Загрузить: <label>"`, reorder-тест удалён) — 59 passed. Решения: legacy не мигрируем (db:seed), превью в шаге 6 = base64 клиенту, ai_generated только на новых.
- **e2e-ловушка для слотов:** занятый слот рендерится как `<ul className="contents"><li>` (по одному `<ul>` на слот) — счётчики `ul li` = число сохранённых фото. Пустые плитки — `<button>` вне `<ul>`. Загрузка в e2e: `page.waitForEvent('filechooser')` + клик по `getByTitle('Загрузить: <label>')`.
