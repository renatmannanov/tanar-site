# Backlog: статусы на витрине + инструменты фото

> Источник: ручная проверка Плана C (full-crud-media), 2026-06-01.

## 1. Фильтрация витрины по статусу товара (✅ ВЫПОЛНЕНО — storefront-completion, 2026-06-01)

> Реализовано в плане `task_tracker/done/storefront-completion/`. Выбран вариант
> «отдельные storefront-функции» (`getStorefrontProducts`/`*ByCategory`/`*BySlug`/
> `*RelatedProducts` в `src/core/catalog/repository.ts`), фильтр
> `status IN ('published','coming_soon')`. Витринные страницы переключены на них;
> админка осталась на старых (видит все статусы). Прямой заход на draft/archived
> на витрине → 404. Покрыто e2e (`storefront-completion.spec.ts`).

**Сейчас:** статус (`draft`/`published`/`archived`/`coming_soon`) на витрине НЕ фильтрует.
`getAllProducts`/`getProductsByCategory`/`getRelatedProducts` (`src/core/catalog/repository.ts`)
возвращают ВСЕ товары. Единственное влияние статуса — `coming_soon` рендерит
«Скоро в продаже» вместо галереи (`ProductCard`, `ProductDetail`). То есть `draft`
и `archived` сейчас видны покупателям как обычные товары.

**Надо:**
- `published` — показывать на витрине.
- `coming_soon` — показывать с бейджем «Скоро» (уже так).
- `draft` — скрыть с витрины (виден только в админке).
- `archived` — скрыть с витрины.

**Где править:** read-функции каталога (добавить фильтр `status IN ('published','coming_soon')`
для публичных вызовов) ИЛИ отдельные «storefront»-варианты функций, чтобы админка
по-прежнему видела всё. Решить: флаг в функцию vs отдельная функция. Учесть
`/catalog/[slug]` прямой заход на draft/archived → 404 на витрине, но доступен в админке.

## 2. Перекраска фото в другой цвет (AI, не слишком далёкий)

Идея заказчицы: загрузил фото для одного цвета-варианта → кнопка «применить к другому
цвету» → AI перекрашивает изделие, получаем такой же набор кадров в другом цвете.
Родственно слоту «✨ Сгенерировать на белом фоне» (тоже AI, слот уже стоит disabled
в `VariantPhotos`). Оба — отдельный план «AI photo tools»: генератор на белом фоне +
смена цвета. Вход — существующие `media_assets` варианта, выход — новые `media_assets`
для целевого варианта.

## Связанное
- Слот-заглушка генератора: `src/components/admin/VariantPhotos.tsx` (кнопка disabled «Скоро»).
- Загрузка/хранение фото: `@/core/media/store` (Plan C).
