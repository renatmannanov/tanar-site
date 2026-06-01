# Шаг 8: Завершение плана

> Зависит от: шаги 1-7
> Статус: [ ] pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой):
  - [ ] `npm run typecheck` / `lint` / `build` — ок
  - [ ] `npm run test:e2e` — все зелёные (витрина + admin B + CRUD/media C)
  - [ ] `updateProduct` сохраняет variantId + reservedQty (SQL до/после)
  - [ ] create: «Создать товар» → /new → создание → редирект на edit
  - [ ] delete: «Удалить товар» → подтверждение → удалён, витрина 404
  - [ ] upload/remove/reorder фото работают; «Главное» = первое; слот генератора disabled
  - [ ] витрина показывает фото из media_assets, фолбэк градиент
- [ ] Smoke (предусловие `npm run db:up && npm run db:seed`): создать товар → залить 2 фото → reorder → витрина показывает → удалить товар end-to-end
- [ ] Не сломано: витрина (`/`, `/catalog`, `/catalog/[slug]`, `/blog`) и прежние 45 e2e
- [ ] `sharp` в deps; client-бандл НЕ содержит sharp/fs/postgres (build проходит)
- [ ] CLAUDE.md обновлён: media-реализация (sharp→public), **прод-требование: persistent volume на `public/images/products/`**, обновлён раздел «Данные» (фото в media_assets, не по конвенции)
- [ ] ARCHITECTURE-ecommerce.md: План C отметить выполненным (Фаза 1 завершена целиком)
- [ ] progress.md Learnings: отложенные пункты (orphan-файлы при delete; ручной alt — SEO-фаза; DnD-reorder вместо стрелок), передача в Фазу 2/3
- [ ] Мусор убран (разовые tsx-скрипты, временные файлы)
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `todo/full-crud-media/` → `done/full-crud-media/`

## Отложенные пункты (зафиксировать в progress.md Learnings)
- **Orphan-файлы:** `deleteProduct` чистит строки media_assets (каскад), но НЕ файлы в `public/`. Добавить чистку файлов (хук в deleteProduct / `MediaStore.removeByProduct`) — позже.
- **Ручной alt** для фото — на SEO-фазе (сейчас авто-генерация).
- **DnD-reorder** вместо кнопок ←/→ — улучшение UX позже.
- **Генератор фото на белом фоне** — слот готов (disabled), реализация — отдельный план.
- **Прод:** persistent volume на `public/images/products/` обязателен (иначе редеплой сотрёт фото).

## Критерии готовности шага
- [ ] Все галочки выше проставлены
- [ ] Коммит: `chore(plan): complete full-crud-media (plan C), move to done/`
