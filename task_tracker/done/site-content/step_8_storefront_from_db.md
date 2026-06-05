# Шаг 8: Витрина читает из БД

> Зависит от: шаг 7 (таблицы + core/site)
> Статус: [ ] pending

## Задача

Переключить `/contacts`, `/faq` и футер с констант (`src/lib/site-contacts.ts`, `src/lib/faq.ts`) на чтение из БД (`getSiteSettings`, `listFaqItems`). Правка в БД → меняется на витрине.

### Изменения

- **`/contacts`**: страница становится async/server-read → `getSiteSettings()`. Добавить `export const dynamic = 'force-dynamic'` (контактов мало, живые данные важнее кэша; единообразно с каталогом).
- **`/faq`**: аналогично → `listFaqItems()`, `force-dynamic`.
- **Футер** (`Footer.tsx`, server component): читает `getSiteSettings()` напрямую для телефона/адреса/Instagram/ИП-БИН. Футер обёрнут вокруг ВСЕХ публичных страниц, включая SSG-блог.

  **РЕШЕНО (один путь, без вилок):** `getSiteSettings()` и `listFaqItems()` в `@/core/site` **оборачивают чтение в try/catch и при любой ошибке/отсутствии БД возвращают дефолт** (site_settings → объект с пустыми полями; faq → `[]`). Это копия паттерна ленивого db-Proxy в проекте (`build` идёт без DATABASE_URL). Тогда:
  - Footer читает БД напрямую, НИКАКИХ пропов из layout и НИКАКОГО перевода layout в dynamic.
  - SSG-блог/главная собираются без БД (футер на них получит дефолт на build-time, реальные данные — в рантайме, т.к. эти данные не критичны для статической разметки).
  - **НЕ делать** запасной вариант «проп из layout + dynamic layout» — он отвергнут.
- Константы `src/lib/site-contacts.ts` / `faq.ts` — оставить ТОЛЬКО как сид-источник (их импортит `seed.ts` шага 7). **Явно удалить их импорт из `Footer.tsx`, `/contacts`, `/faq`** — витрина читает исключительно из БД. После шага 8 ни один компонент витрины не импортит эти константы напрямую (проверить грепом: `grep -rn "site-contacts\|lib/faq" src/app src/components` → только seed/lib, не витрина).

### Грабли (из CLAUDE.md)

- `build` идёт БЕЗ DATABASE_URL (db-клиент ленивый Proxy). За счёт try/catch-дефолта в `@/core/site` сборка не должна падать на «collect page data». **Обязательно проверить `npm run build` БЕЗ поднятой БД** (остановить postgres или временно убрать DATABASE_URL) — это критерий готовности, а не опция.

## Тесты

- e2e `site-content.spec.ts` (из шага 6) продолжает проходить (контент тот же, но из БД).
- Ручная проверка: изменить телефон в БД (или через будущую админку) → отражается на /contacts и в футере.
- `npm run build` без БД не падает (ленивый клиент / try-catch).

## Команды для верификации

```powershell
npm run db:up; npm run db:migrate; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `/contacts`, `/faq`, футер читают из БД (`getSiteSettings`/`listFaqItems`)
- [ ] `getSiteSettings`/`listFaqItems` устойчивы к отсутствию БД (try/catch → дефолт)
- [ ] **`npm run build` БЕЗ поднятой БД проходит** (проверено явно — остановив postgres)
- [ ] Импорт констант `site-contacts`/`faq` удалён из витрины (греп: только в seed/lib)
- [ ] e2e зелёный; контент на витрине не изменился визуально
- [ ] Коммит: `feat(site): contacts/faq/footer read from DB`
