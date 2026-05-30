# Админка: редактирование (План B, Фаза 1 этап 2)

> Статус: pending
> Дата: 2026-05-29
> Тип: фича (admin shell + auth + редактирование каталога)

## Цель

Дать заказчице защищённую админку для **редактирования** товаров каталога. Строим **оболочку (shell)** под все будущие разделы сразу: cookie-auth + middleware на route-group `(admin)`, навигация как реестр разделов, общий media-picker (слот). Раздел `catalog` — список товаров + универсальная форма `mode: create|edit`, открытая на **edit** (сохраняет через готовый `updateProduct`). Кнопки **create/delete** и **слот фото** видны, но `disabled` — ловим раскладку сразу, активируем в Плане C.

Гарантия «без переделки»: редактирование — подмножество CRUD; контракты (План A) и формы (План B) пишутся в полном виде, План C только снимает `disabled` и оживляет media-picker + sharp.

## Контекст (читать перед стартом)

- `progress.md` (в этой папке) — находки по коду: что есть, чего нет, что не сломать, точные сигнатуры.
- `task_tracker/backlog/ARCHITECTURE-ecommerce.md` — секции «Архитектура админки» (реестр разделов, media-picker, resource-каркас) и «Решения по Фазе 1».
- `task_tracker/done/real-catalog-import/` — фундамент: write-контракт `createProduct/updateProduct/deleteProduct`, контракт `MediaStore`.
- `task_tracker/backlog/admin-content-management.md` — Фаза 6 (site-media/blog); сейчас НЕ делаем, но shell должен принять их без переделки.

## Архитектурные решения (зафиксированы, без альтернатив)

- **Auth:** cookie-сессия + единый пароль из env (`ADMIN_PASSWORD`). Логин-форма (server action) проверяет пароль → ставит подписанную httpOnly-cookie (`admin_session`, HMAC от секрета `ADMIN_SESSION_SECRET`). Без БД-таблицы пользователей, без ролей. Logout чистит cookie. **Next 15: `cookies()` асинхронный — везде `await cookies()`.** `ADMIN_SESSION_SECRET` < 32 симв. → throw.
- **Защита:** `middleware.ts` (корень `src/`) перехватывает `/admin/*` (matcher `/admin/:path*`) на Node-runtime, проверяет валидность cookie (`req.cookies.get(...)` — синхронный middleware API), иначе redirect `/admin/login`. Сама `/admin/login` — исключение из guard.
- **Route-group + сегмент admin:** витрина выносится в route-group `src/app/(public)/` со своим `layout.tsx` (Header/Footer) — **безусловно** (изолирует админку от витринной шапки). Корневой layout становится минимальным (`<html><body>{children}`). Админка — РЕАЛЬНЫЙ сегмент `src/app/admin/` (не `(admin)` в скобках — проще middleware matcher и явный URL `/admin`) со своим `admin/layout.tsx`. URL витрины не меняются.
- **Shell:** `src/app/admin/layout.tsx` = **только вёрстка** (сайдбар + Logout + `{children}`), БЕЗ auth-guard (guard в layout конфликтует с вложенной login-страницей). Аутентификация: middleware + `requireAdmin()` (async, `await cookies()`) в начале каждой защищённой server-page (defense in depth); login-page `requireAdmin()` НЕ вызывает. Навигация — из **реестра разделов** (`adminSections`: id, label, href, enabled). Сейчас активен `catalog`; `inventory/orders/site-media/blog` — `enabled:false` (серым) для визуальной проверки каркаса.
- **UI-стек:** Tailwind v3 (есть) + **Radix UI primitives** точечно (Dialog для подтверждений, Label/Slot). shadcn-стиль копированием в `src/components/admin/ui/` (НЕ ставим весь shadcn-CLI). Минимум зависимостей: `@radix-ui/react-dialog`, `@radix-ui/react-label`. Эстетика — функциональный внутренний инструмент (нейтральные серые, плотная сетка), НЕ outdoor-витрина.
- **Форма товара:** универсальный компонент `ProductForm` с пропом `mode: 'create' | 'edit'`. В Плане B рендерится только на edit-странице. Поля: slug, name, category(select из CATEGORIES), priceBase, status(select), description(textarea), label{badge,sub}, care, + редактор вариантов (цвет: colorId/colorLabel/hex) и SKU внутри варианта (size/ruSize/article/stockQty). Кнопка submit активна (edit); кнопки «Создать»/«Удалить» и блок «Фото» — в разметке, но `disabled` с тултипом «Доступно в Плане C».
- **Маппинг Product↔ProductInput:** read-слой отдаёт `Product` (поле `price`, `variants[].id/label`), write принимает `ProductInput` (поле `priceBase`, `variants[].colorId/colorLabel`). Форма при загрузке маппит `Product → ProductInput` (price→priceBase, id→colorId, label→colorLabel, skus как есть), submit шлёт `ProductInput` в server action → `updateProduct(slug, input)`. Маппер — отдельная чистая функция `productToInput()` в admin-разделе (НЕ в core: это adapter витрины админки).
- **Сохранение:** server action `updateProductAction(slug, input)` в `src/app/admin/catalog/actions.ts` (`'use server'`): `requireAdmin()` первой строкой; **форсирует `slug` из маршрута** (`{...input, slug}` — иначе `updateProduct` перезапишет slug и сломает URL); zod валидирует внутри `updateProduct`; ловит ошибку → `{ error }`; успех → `revalidatePath` + `redirect` **ВНЕ try/catch**. Импорт `updateProduct` из `@/core/catalog`.
- **Граница ESLint:** admin-код в `app/` импортит `@/core/catalog` (публичный API) — разрешено. Внутри admin — относительные пути. Не нарушаем правила `eslint.config.mjs`.

## Шаги

| # | Файл | Статус |
|---|------|--------|
| 1 | step_1_auth_session.md — env, cookie-сессия (подпись/проверка), login/logout server actions + страница логина | [x] |
| 2 | step_2_middleware_guard.md — middleware.ts: guard на /admin/*, redirect на /admin/login | [x] |
| 3 | step_3_admin_shell.md — витрина в (public)/, admin layout, реестр разделов, базовый UI (Radix dialog/label) | [x] |
| 4 | step_4_catalog_list.md — раздел /admin/catalog: список товаров (из getAllProducts), ссылки на edit, кнопка «Создать» (disabled) | [x] |
| 5 | step_5_product_form.md — ProductForm (mode create\|edit) + маппер productToInput; варианты/SKU; фото-слот и create/delete disabled | [x] |
| 6 | step_6_edit_save.md — /admin/catalog/[slug]/edit + updateProductAction (server action) → updateProduct, revalidate, redirect | [x] |
| 7 | step_7_e2e.md — Playwright: логин, guard-redirect, список, редактирование→сохранение, disabled-элементы видны | [x] |
| 8 | step_8_completion.md — завершение плана | [ ] |

## Критерии готовности

- [ ] `npm run typecheck` — без ошибок
- [ ] `npm run lint` — без ошибок (границы модулей соблюдены)
- [ ] `npm run build` — проходит
- [ ] `npm run test:e2e` — все зелёные (вкл. новый admin spec)
- [ ] Без cookie заход на `/admin/catalog` → redirect на `/admin/login`
- [ ] Верный пароль → редирект в админку, ставится httpOnly-cookie; неверный → ошибка, остаёмся на логине
- [ ] Logout чистит cookie, повторный заход требует логина
- [ ] `/admin/catalog` показывает 12 боевых товаров со ссылками на edit
- [ ] Открытие `/admin/catalog/jacket-sv7-goretex/edit` показывает форму, предзаполненную данными товара (name, priceBase=80000, 5 вариантов, SKU с article/ruSize/stockQty)
- [ ] Изменение поля + submit → `updateProduct` отрабатывает, изменение видно на витрине `/catalog/jacket-sv7-goretex` (force-dynamic) и в БД
- [ ] Кнопки «Создать»/«Удалить» и блок «Фото» — присутствуют в DOM, но `disabled` (визуально видны, не активны)
- [ ] Витрина (публичные страницы) не сломана: `/`, `/catalog`, `/catalog/[slug]`, `/blog` работают как раньше
- [ ] env-переменные (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`) задокументированы в `.env.example` и CLAUDE.md
- [ ] Каждый шаг — отдельный коммит
