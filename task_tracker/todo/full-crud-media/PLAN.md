# Полный CRUD + фото (План C, Фаза 1 этап 3)

> Статус: pending
> Дата: 2026-06-01
> Тип: фича (admin create/delete + media-управление + витрина из media_assets)

## Цель

Завершить админку каталога: активировать **создание** и **удаление** товаров (контракты готовы с Плана A) и реализовать **управление фото** вариантов-цветов (добавить/удалить/изменить порядок) с загрузкой через `sharp` в `public/`. Витрина переходит с «фото по конвенции имён» на реальные `media_assets` (фолбэк — CSS-градиент). Оставляем видимый, но `disabled` слот «Сгенерировать на белом фоне» — место под будущий генератор (НЕ делаем сейчас).

Заодно чиним фундамент: `updateProduct` переводится с «снести дерево вариантов и вставить заново» на **upsert по стабильному ключу** — это сохраняет `variantId` (иначе каскад `media_assets` сносит фото при каждом сохранении формы) и `reservedQty`/`stockQty` (закрывает известную ловушку для Фазы 2).

## Контекст (читать перед стартом)

- `progress.md` (в этой папке) — точные сигнатуры, грабли Плана B, что не сломать.
- `task_tracker/done/admin-editing/` — План B: shell, auth, ProductForm, маппер, ConfirmButton, e2e-паттерны.
- `task_tracker/backlog/ARCHITECTURE-ecommerce.md` — «Решения по Фазе 1» (План C — последний этап Фазы 1).

## Архитектурные решения (зафиксированы с пользователем, без развилок)

- **`updateProduct` → UPSERT.** Вместо delete+insert дерева: варианты сверяются по `colorId` (unique `product_variants(product_id, color_id)`), SKU — по `size` внутри варианта (unique `skus(variant_id, size)`). Существующие — UPDATE (id сохраняется), новых — INSERT, исчезнувших — DELETE. `reservedQty` существующих SKU НЕ трогаем; у новых — 0. `createProduct` остаётся delete-free (insert с нуля). Маппер `productToInput` снова прокидывает `reservedQty` (перестаёт дропать).
- **Хранилище фото:** файлы в `public/images/products/<slug>/` (в репо/на диске). `MediaStore.upload`: `sharp` → ресайз (макс. сторона 2000px) + WEBP + 2–3 ширины (1600/800/400) → файлы → строка в `media_assets`. **НЕ кропать на сервере** — кадрирование на витрине через CSS `object-fit: cover`. Форматы входа: JPG/PNG/WEBP/HEIC; макс. файл ~10 МБ. `alt` авто-генерится (`{name}, {colorLabel}, фото N`); ручной ввод — отложен до SEO-фазы.
- **Привязка фото:** к **варианту** (`media_assets.variantId` + `productId`). У каждого цвета свой набор. Первое по `sortOrder` = главное (бейдж «Главное», идёт в карточку каталога/главную).
- **Момент записи фото:** СРАЗУ при загрузке/удалении/reorder (отдельные server actions, НЕ через controlled-форму `ProductForm`). Фото живут независимо от полей товара.
- **Фото только на edit.** На create-странице фото-блок показывает «Сначала сохраните товар» (variantId появляется после создания). `createProductAction` редиректит на edit нового товара.
- **Create:** `/admin/(protected)/catalog/new` (`ProductForm mode="create"`, пустая) → `createProductAction` → редирект на `/admin/catalog/<slug>/edit`.
- **Delete:** кнопка в форме → `ConfirmButton` (готов) → `deleteProductAction` → редирект на список.
- **Защита для дураков:** над сеткой фото — подсказка «4–6 фото: спереди, сзади, деталь, на модели». <3 фото — подсветка «маловато»; ≥8 — кнопка «добавить» гаснет (мягкие лимиты, не жёсткий запрет).
- **Витрина:** галерея (`ProductDetail`), карточка каталога (`ProductCard`), главная (`CategoriesGrid`) читают `media_assets` варианта; нет фото → CSS-градиент-фолбэк. Кадр — `object-fit: cover`.
- **Прод-требование (зафиксировать, не делать сейчас):** на VPS папка `public/images/products/` должна быть persistent volume (иначе редеплой сотрёт загруженные фото).

## Шаги

> **Порядок исполнения:** шаги 1 и 2 независимы (можно в любом порядке). Шаги **3 → 4 → 5 — СТРОГО последовательно** (3 и 4 правят один `actions.ts`; 4 и 5 правят одну `ProductForm.tsx` — параллель потеряет правки). Шаг 6 — после 2 (нужен `listProductImages` + `Product.id`). Шаг 7 (e2e) — после 1-6.

| # | Файл | Статус |
|---|------|--------|
| 1 | step_1_update_product_upsert.md — updateProduct: delete+insert → upsert по colorId/size; маппер прокидывает reservedQty | [x] |
| 2 | step_2_media_store.md — MediaStore impl (sharp→public→media_assets) + reorder в контракте + read media в core | [x] |
| 3 | step_3_admin_create.md — /admin/catalog/new + createProductAction; кнопка «Создать»; slug-паттерн; обновить e2e | [x] |
| 4 | step_4_admin_delete.md — deleteProductAction; кнопка «Удалить» через ConfirmButton; обновить e2e (ПОСЛЕ шага 3) | [x] |
| 5 | step_5_photo_block.md — фото-блок в ProductForm (upload/remove/reorder, главное, слот генератора disabled) (ПОСЛЕ шага 4) | [ ] |
| 6 | step_6_storefront_gallery.md — витрина читает media_assets (ProductDetail/ProductCard/FeaturedProducts), фолбэк градиент, без N+1 | [ ] |
| 7 | step_7_e2e.md — Playwright: create→edit, delete, upload/remove/reorder фото, витрина показывает фото | [ ] |
| 8 | step_8_completion.md — завершение плана | [ ] |

## Критерии готовности

- [ ] `npm run typecheck` — без ошибок
- [ ] `npm run lint` — без ошибок (границы модулей соблюдены)
- [ ] `npm run build` — проходит (client-компоненты не тянут postgres)
- [ ] `npm run test:e2e` — все зелёные (вкл. новый CRUD+media spec; витринные не сломаны)
- [ ] `updateProduct`: правка имени + сохранение НЕ меняет `variantId`/`reservedQty` существующих SKU (проверить SQL до/после)
- [ ] `/admin/catalog` → «Создать товар» активна → `/admin/catalog/new` → заполнение → создаётся товар, редирект на его edit
- [ ] В форме edit «Удалить товар» активна → подтверждение → товар удалён, редирект на список, на витрине 404
- [ ] Загрузка фото в варианте: файл обработан (webp, ≤2000px), лежит в `public/images/products/<slug>/`, строка в `media_assets`, превью видно СРАЗУ (без сохранения формы)
- [ ] Удаление фото (× + подтверждение) убирает превью и строку; reorder меняет порядок и «Главное»
- [ ] Витрина `/catalog/<slug>` с загруженными фото показывает их (не градиент); товар без фото — градиент
- [ ] Слот «Сгенерировать на белом фоне» виден и `disabled`
- [ ] Прод-требование (persistent volume на `public/images/products/`) зафиксировано в CLAUDE.md/progress
- [ ] Каждый шаг — отдельный коммит
