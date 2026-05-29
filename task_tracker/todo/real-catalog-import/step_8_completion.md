# Шаг 8: Завершение плана

> Зависит от: шаги 1-7
> Статус: [ ] pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой):
  - [ ] `npm run db:migrate` — ок
  - [ ] `npm run db:seed` → `import OK` 12/30/109
  - [ ] БД: products=12, variants=30, skus=109 (psql)
  - [ ] `npm run typecheck` — ок
  - [ ] `npm run lint` — ок
  - [ ] `npm run build` — ок
  - [ ] `npm run test:e2e` — все зелёные
  - [ ] `seed-data.ts` отсутствует
  - [ ] Grep `hoodies`/`t-shirts` по src/ — 0
  - [ ] `core/catalog` экспортит createProduct/updateProduct/deleteProduct
  - [ ] повторный `db:seed` идемпотентен
- [ ] Smoke test: `/catalog` показывает 12 боевых товаров, фильтры по 5 категориям работают, карточка товара открывается
- [ ] Не сломано: блог (`/blog`, `/blog/[slug]`) без изменений; `public/images/` не тронут (git status чист по папке)
- [ ] `npm run images:check` зелёный
- [ ] CLAUDE.md проекта обновлён, если нужно:
  - категории сменились (jackets/pants/shorts/tshirts/polo) — обновить раздел «Структура сайта» если там перечислены старые
  - упомянуть catalog-snapshot.json как источник реального каталога
- [ ] Документы синхронизированы: `real-catalog-import.md` статус → done/выполнен; ARCHITECTURE «Решения по Фазе 1» — План A отметить выполненным
- [ ] Мусор убран (временные файлы, `_review_*.md`, старый seed.ts если переименовывался)
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `todo/real-catalog-import/` → `done/real-catalog-import/` (вместе с catalog-snapshot.json — он остаётся снапшот-источником для Фазы 5)
- [ ] **После переезда папки — обновить относительные пути к `catalog-snapshot.json`** в импорт-скрипте (`src/core/db/seed.ts` или `import-catalog.ts`) и в `scripts/check-images.ts` на `done/real-catalog-import/...`. Прогнать `npm run db:seed` и `npm run images:check` ещё раз — оба зелёные (иначе следующий реимпорт/проверка упадёт с ENOENT). Это последняя правка перед финальным коммитом.

## Передача в План B

После завершения зафиксировать в progress.md (Learnings) для Плана B (админка-редактирование):
- write-контракт `createProduct/updateProduct/deleteProduct` готов, обкатан на 109 SKU
- `updateProduct` заменяет variants/skus целиком (форма админки шлёт товар целиком)
- media — только контракт (`MediaStore` интерфейс), реализация в Плане C
- боевые 12 товаров в БД, фото нет (товары на градиентах)

## Критерии готовности шага

- [ ] Все галочки выше проставлены
- [ ] Коммит: `chore(plan): complete real-catalog-import, move to done/`
