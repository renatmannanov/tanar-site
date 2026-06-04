# Шаг 6: Завершение плана

> Зависит от: шаги 1-5
> Статус: [x] done

## Чеклист

- [x] Все шаги плана выполнены ([x] в PLAN.md)
- [x] Критерии готовности из PLAN.md проверены (каждый — командой/тестом):
  - [x] `npm run typecheck` / `lint` / `build` — ок
  - [x] `npm run test:e2e` — все зелёные (58, прежние + 7 новых)
  - [x] slug автогенерится из названия (транслит), поле read-only
  - [x] specs редактируются в форме, пишутся в БД, видны на витрине
  - [x] draft/archived скрыты с витрины (404 на прямой заход), видны в админке
  - [x] published/coming_soon видны
  - [x] витрина товара: размеры, care, бейдж; бейдж на карточке
- [x] Не сломано: витрина (`/`, `/catalog`, `/catalog/[slug]`, `/blog`), админка, прежние e2e — все 58 e2e зелёные
- [x] CLAUDE.md обновлён: раздел «Данные» — статусная видимость витрины (storefront-функции), автоген slug, specs-редактор
- [x] Бэклог `task_tracker/backlog/storefront-status-and-photo-tools.md`: пункт #1 (фильтрация по статусу) — закрыт; пункт #2 (AI-фото) остаётся
- [x] Память проекта обновлена (`storefront-completion-done.md` + MEMORY.md) — что сделано, что дальше (Фаза 2 остатки)
- [x] Мусор убран (разовые tsx-скрипты удалены)
- [x] Статус в PLAN.md → done
- [x] Папка перемещена: `todo/storefront-completion/` → `done/storefront-completion/`

> Smoke end-to-end (создать → publish → витрина / draft → archived) покрыт автоматически в `storefront-completion.spec.ts` (тесты slug-автоген, publish→виден с размерами/specs, draft→404, archived→404) — отдельная ручная проверка не требуется.

## Критерии готовности шага
- [x] Все галочки выше проставлены
- [x] Коммит: `chore(plan): complete storefront-completion, move to done/`
