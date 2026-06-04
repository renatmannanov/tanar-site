# Шаг 8: Завершение плана

> Зависит от: шаги 1-7
> Статус: [x] done

## Чеклист

- [x] Все шаги плана выполнены ([x] в PLAN.md)
- [x] Критерии готовности из PLAN.md проверены (каждый — командой):
  - [x] `npm run typecheck` / `lint` / `build` — ок
  - [x] `npm run test:e2e` — все зелёные (51: витрина + admin B + CRUD/media C)
  - [x] `updateProduct` сохраняет variantId + reservedQty (tsx-тест, шаг 1)
  - [x] create: «Создать товар» → /new → создание → редирект на edit (e2e + ручная)
  - [x] delete: «Удалить товар» → подтверждение → удалён, витрина 404 (e2e + ручная)
  - [x] upload/remove/reorder фото работают; «Главное» = первое; слот генератора disabled (e2e + ручная)
  - [x] витрина показывает фото из media_assets, фолбэк градиент (e2e + ручная)
- [x] Smoke (ручная проверка пользователем): создать товар → залить фото → reorder → витрина показывает → удалить — OK
- [x] Не сломано: витрина (`/`, `/catalog`, `/catalog/[slug]`, `/blog`) и прежние e2e (51 зелёных)
- [x] `sharp` в deps; client-бандл НЕ содержит sharp/fs/postgres (build проходит)
- [x] CLAUDE.md обновлён: media-реализация (sharp→public), прод-требование persistent volume, раздел «Данные» (фото в media_assets)
- [x] ARCHITECTURE-ecommerce.md: План C отмечен выполненным (Фаза 1 завершена целиком)
- [x] progress.md Learnings: отложенные пункты (orphan-файлы, slug-автоген, статусы, AI-фото, alt, DnD) + git/build-грабли
- [x] Мусор убран (разовые tsx-скрипты удалены по ходу)
- [x] Статус в PLAN.md → done
- [ ] Папка перемещена: `todo/full-crud-media/` → `done/full-crud-media/` (последним шагом)

## Отложенные пункты (зафиксировать в progress.md Learnings)
- **Orphan-файлы:** `deleteProduct` чистит строки media_assets (каскад), но НЕ файлы в `public/`. Добавить чистку файлов (хук в deleteProduct / `MediaStore.removeByProduct`) — позже.
- **Ручной alt** для фото — на SEO-фазе (сейчас авто-генерация).
- **DnD-reorder** вместо кнопок ←/→ — улучшение UX позже.
- **Генератор фото на белом фоне** — слот готов (disabled), реализация — отдельный план.
- **Прод:** persistent volume на `public/images/products/` обязателен (иначе редеплой сотрёт фото).

## Критерии готовности шага
- [ ] Все галочки выше проставлены
- [ ] Коммит: `chore(plan): complete full-crud-media (plan C), move to done/`
