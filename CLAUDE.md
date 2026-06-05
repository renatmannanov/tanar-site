# CLAUDE.md — tanar-site

Маркетинговый сайт казахстанского outdoor-бренда **Tanar** (каз. "тот, кто встречает рассвет"). Логотип — силуэт горы Хан Тенгри. Вдохновение: Patagonia, Arc'teryx.

## Стек

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS v3** (v4 намеренно не используем — нестабилен для автоматизации). Конфиг — `tailwind.config.ts` (content-пути + плагин typography), postcss через `tailwindcss` + `autoprefixer`.
- **`@tailwindcss/typography`** установлен, но класс `prose` не применяется (типографика вручную)
- **`next-mdx-remote/rsc`** + **`gray-matter`** для блога
- **Playwright** для smoke-тестов, `reuseExistingServer: true`
- **Postgres + Drizzle ORM** — каталог, остатки, заказы, медиа. Локально через Docker (`npm run db:up`).
- **drizzle-kit** для миграций (`npm run db:migrate`).
- Все функции каталога — **async** (читают из БД через `@/core/catalog`).
- Контент блога — `.mdx` в `content/blog/` (без БД, отдельно от каталога — переедет в Фазе 6).

## Commands

```bash
npm install                    # установка
npm run dev                    # дев-сервер (http://localhost:3000)
npm run build                  # продакшен-билд (должен проходить)
npm run start                  # запуск прод-сборки
npm run typecheck              # tsc --noEmit
npm run lint                   # ESLint
npm run test:e2e               # Playwright smoke
```

### Database (Postgres via Docker)

```bash
npm run db:up         # поднять postgres-dev (5442) + postgres-test (5443)
npm run db:down       # остановить
npm run db:migrate    # применить миграции drizzle-kit к dev-БД
npm run db:generate   # сгенерировать SQL после изменения src/core/db/schema.ts
npm run db:seed       # импортировать боевой каталог (dev-инструмент; источник — task_tracker/.../catalog-snapshot.json через createProduct)
npm run db:reset      # очистить все таблицы
```

> **Предусловие для `build`/`test:e2e`/dev:** `.env.local` с `DATABASE_URL` + поднятый Postgres. Хост-порты 5442/5443 (а не 5432/5433: на хосте занят нативный PostgreSQL). При force-dynamic сам `build` БД не читает, но рантайм-рендер и e2e — читают: `npm run db:up && npm run db:seed` перед ними.

Каждый step-файл в `task_tracker/` указывает свои verification-команды.

### Admin auth (Фаза 1, План B)

Однопользовательская cookie-аутентификация без БД. Env в `.env.local` (см. `.env.example`):
- `ADMIN_PASSWORD` — пароль входа.
- `ADMIN_SESSION_SECRET` — HMAC-ключ подписи cookie, **≥32 символов** (иначе throw).

`/admin/login` → подписанная httpOnly-cookie (`admin_session`, HMAC-SHA256 `{exp}`). Guard: `middleware.ts` (redirect на login) + `requireAdmin()` в защищённых страницах/actions. e2e и dev требуют этих env в окружении (Next читает `.env.local`; Playwright — через `@next/env` в `playwright.config.ts`).

## Прод-деплой (VPS + Docker + Caddy)

Витрина деплоится как Docker Compose стек: `web` (Next.js standalone) + `postgres` + `caddy` (reverse-proxy + авто-SSL Let's Encrypt). Артефакты в корне: `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`, `.env.prod.example`, `docker-entrypoint.sh`. План и грабли — `task_tracker/done/prod-deploy/` (progress.md → Learnings).

**Демо сейчас:** Hetzner VPS `62.238.31.95`, https://62-238-31-95.sslip.io (sslip.io — времянка; боевой `.kz` будет на PS.kz, шаг 11). Сервер: `~/tanar-site`, юзер `rm_agent`.

**Ключевое:**
- **Образ:** `node:20-slim` (НЕ alpine — sharp). Multi-stage: deps→builder→runner. `output:'standalone'` в `next.config.ts`. `build` идёт БЕЗ DATABASE_URL (db-клиент ленивый — Proxy в `src/core/db/client.ts`, throw отложен в рантайм; иначе `collect page data` падает).
- **Фото:** named volume `product-images` → `/app/public/images/products` (**persistent — иначе редеплой сотрёт фото**). Права: entrypoint chown'ит volume от root → `gosu node`. **Раздача фото — через Caddy напрямую с volume** (`handle_path /images/products/*` → `file_server`, volume смонтирован `:ro` в caddy): Next standalone НЕ отдаёт рантайм-загрузки из `public/` (только то, что было на момент билда) → проксированный запрос даёт 404. Локально (dev) не воспроизводится. При переезде на другой сервер этот Caddy-роут обязателен.
- **tools-сервисы** (profile `tools`, образ = builder-стадия): `migrate` (`drizzle-kit migrate`), `seed`, `seed-site` (site_settings+faq, idempotent, без ALLOW_PROD_SEED), `push-media`. Запуск: `docker compose -f docker-compose.prod.yml --profile tools run --rm <name>`. **При деплое с новыми миграциями/кодом собирать `--no-cache`** — `up --build` может взять слой `COPY . .` из build cache и не подтянуть свежие файлы.
- **Сид прода — РАЗОВО:** `ALLOW_PROD_SEED=1` ТОЛЬКО inline (не в .env). Предохранитель: `seed.ts` отказывает при `count(products)>0` — повторный TRUNCATE невозможен.
- **Секреты** в `.env` на сервере (права 600, gitignored): пароль БД (== в `DATABASE_URL`), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (≥32), `DOMAIN`, `COMPOSE_PROJECT_NAME=tanar-site`.
- **Деплой с `main`** (приведена к dev). Порядок первого деплоя: DNS→`up --build`→`migrate`→`restart web`→seed(inline). Подробный runbook — `step_7_first_deploy.md`.

### Деплой-команды (на сервере, `~/tanar-site`)

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build        # собрать+поднять
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate      # миграции
docker compose -f docker-compose.prod.yml --profile tools run --rm -e ALLOW_PROD_SEED=1 seed  # разовый сид
docker compose -f docker-compose.prod.yml --env-file .env logs -f caddy         # смотреть выпуск cert
docker compose -f docker-compose.prod.yml --env-file .env ps                    # статус
```

## Структура сайта (v1)

- `/` — главная: hero, категории, featured продукты, сторителлинг-блок, последние посты блога, footer
- `/catalog` — все товары, фильтр-чипы по категориям (jackets, hoodies, t-shirts, pants, shorts)
- `/catalog/[slug]` — карточка товара: галерея, название, цена, описание, tech specs, кнопка "Узнать о наличии" (заглушка)
- `/blog` — листинг постов
- `/blog/[slug]` — страница поста
- `/contacts` — контакты (телефоны+имена, Instagram, адрес, самовывоз) — из БД
- `/faq` — частые вопросы (аккордеон `<details>`) — из БД
- Шапка (лого, навигация: «Контакты» → `/contacts`, «О бренде» → `/#story`), футер — живые ссылки (контакты/FAQ/блог/Instagram, tel:, ИП+БИН) из БД

## Модульная структура (modular monolith, начало — Фаза 0)

```
src/
  core/                ← доменное ядро, не зависит от marketplace/
    catalog/           каталог: Product/Variant/Sku, async-репозиторий.
                       Два входа: @/core/catalog (server, вкл. repository→БД),
                       @/core/catalog/client (client-safe: types/format/images/gradient/categories).
    inventory/         (заглушка, Фаза 2)
    orders/            (заглушка, Фаза 3)
    media/             (заглушка, Фаза 1 — admin-загрузка)
    site/              site_settings (синглтон) + faq_items: @/core/site (server:
                       read/write, DB-error-safe дефолты), @/core/site/client (типы).
    db/                Drizzle: schema, client, migrations, seed (real-catalog import)
    contracts/         общие union-типы домена (ProductCategory, OrderSource, ...)
  marketplace/
    contract/          (Фаза 5) MarketplaceModule интерфейс
  app/                 Next.js App Router
    (public)/          витрина (Header/Footer layout): page, catalog/, blog/, contacts/, faq/, icon
    admin/             админка (Фаза 1, План B): login/ (вне сайдбара),
                       (protected)/ (сайдбар-shell + requireAdmin): catalog/ edit, settings/, faq/
  components/, lib/     UI и общие утилиты (lib/blog, lib/gradients, lib/admin-auth, lib/require-admin)
  middleware.ts        guard на /admin/* (nodejs-runtime), redirect на /admin/login
```

> **Client-компоненты админки импортят `@/core/catalog/client`, НЕ `@/core/catalog`** — barrel тянет `repository.ts`→postgres в client-бандл и ломает `build` (typecheck/lint этого не ловят — гонять `build`).

Границы модулей: импорт ТОЛЬКО через публичный API (`index.ts`, либо `/client` для catalog).
ESLint (`eslint.config.mjs`) запрещает: импорт внутренностей модуля минуя index.ts; импорт `@/marketplace/*` из `@/core/*` (обратная зависимость). Внутри модуля — относительные пути.

Каталог рендерится **dynamic** (`force-dynamic` на `/`, `/catalog`, `/catalog/[slug]`) — живые данные из БД. Блог остаётся SSG.

## Данные

- **Продукты**: хранятся в Postgres (`products`, `product_variants`, `skus`). Доступ через `@/core/catalog` (async). Запись — только через write-контракт (`createProduct`/`updateProduct`/`deleteProduct`). `updateProduct` — **upsert** по `colorId`/`size` (сохраняет `variantId` и `reservedQty`, не сносит фото). Наполнение dev-БД: `npm run db:seed` — импорт боевого каталога (12/30/109) из `task_tracker/.../catalog-snapshot.json` через `createProduct`.
  - **Видимость по статусу (Фаза 1.5):** витрина читает через отдельные `getStorefront*` функции (фильтр `status IN ('published','coming_soon')`); `draft`/`archived` скрыты (нет в каталоге/related/featured, прямой заход → 404). Старые `getAll*`/`getProductBySlug`/… НЕ фильтруют — их зовёт админка (видит все статусы). Не путать публичные и storefront-функции при правках витрины.
  - **slug (Фаза 1.5):** на create генерируется автоматически из `name` транслитерацией кириллицы (`@/lib/slugify`, client-safe, канон-таблица — её пинят e2e). Поле read-only. Коллизии решает `ensureUniqueSlug` на сервере (`kurtka`→`kurtka-2`); редирект — на фактический slug. На edit slug неизменен.
  - **specs/care/label на витрине (Фаза 1.5):** specs (характеристики) редактируются в `ProductForm` и рендерятся таблицей; на странице товара также показываются размеры активного цвета (size + ruSize), блок «Уход» (care) и бейдж `label.badge`; бейдж — и на карточке каталога.
- **Фото товаров**: в таблице `media_assets`, привязка к **варианту-цвету** (`variantId`). Загрузка — админка (Фаза 1, План C): `MediaStore` (`@/core/media/store`) гоняет `sharp` → 3×WEBP (1600/800/400, макс 2000px) в `public/images/products/<slug>/`. Приём JPG/PNG/WEBP (HEIC не поддержан prebuilt-sharp на Windows). Чтение для витрины — `@/core/media` (`listProductImages`/`listProductImagesForProducts`). Витрина: фото есть → галерея (object-cover, srcset); нет → CSS-градиент-фолбэк.
  - **Прод-требование:** `public/images/products/` на VPS должна быть **persistent volume** — иначе редеплой сотрёт загруженные фото.
  - **ИИ-генерация фото (photo-pipeline, done):** в админке заказчик заполняет **сетку 6 слотов** на цвет — `life_{front,side,back}` + `flat_{front,side,back}` (helpers в `@/core/media/client`: `PHOTO_SLOTS`/`slotOf`/`assetsBySlot`/`hexDistance`). Движок генерации — домен-агностик модуль `@/core/photogen` (server-only: `GeminiProvider` через `@google/genai`, `FakeProvider` для e2e, `recipes.ts` промпты 1–3). 3 рецепта: **flat** (живое→на белом, ракурс из целевого слота — фикс лого на спине), **recolor-flat**, **recolor-lifestyle** (перекраска в hex цвета из соседнего цвета, источник выбирается с миниатюрами, сортировка по близости hex). **Поток:** генерация → превью (base64, держит клиент) → апрув «Оставить» → `approveGeneratedAction` грузит через `mediaStore.upload`. Ничего не сохраняется без апрува. «Сделать все на белом» — пакет с подтверждением + общим превью. Сгенерированные → `media_assets.ai_generated=true`, бейдж «ИИ» в админке + метка на витрине. Env: `GEMINI_API_KEY` (обязателен для кнопок), `PHOTOGEN_RECOLOR_LOCK` (`hard` дефолт), `PHOTOGEN_DAILY_LIMIT` (выкл), `PHOTOGEN_FAKE=1` (e2e). Уроки промптов — `internal/docs/nano-banana-recipes.md` (gitignored). **swap (надеть товар) ОТКЛОНЁН; генерация-с-нуля по тексту НЕ делаем.**
    - **Client-компоненты НЕ импортят `@/core/photogen` и `@/core/media/store`** (sharp/genai → ломают build). Превью-`<img>` рендерить ВНЕ слот-`<ul>` (иначе e2e посчитает его сохранённым).
- **Контент сайта (site-content, done):** контакты и FAQ — в БД (`site_settings` синглтон + `faq_items`), редактируются в админке («Настройки сайта» / «FAQ»). Витрина (`/contacts`, `/faq`, футер) читает через `@/core/site` (`getSiteSettings`/`listFaqItems`) — **force-dynamic**; чтение обёрнуто в try/catch → дефолт (build без DATABASE_URL не падает, как и каталог). Константы `src/lib/site-contacts.ts` + `src/lib/faq.ts` — теперь ТОЛЬКО источник для сида (витрина их не импортит). PII (телефоны+имена Айман/Милена, Instagram, адрес, ИП+БИН) публикуется сознательно (решение владельца). IBAN/банк — в `site_settings`, но НЕ на витрине до Фазы 3. Перевод «Таңар» = «тот, кто встречает рассвет»; происхождение названия = Хан-Тенгри (не «Тенгри/Небо»). Редактирование блог-статей — отложено в бэклог (Фаза 6, `admin-content-management.md` 6b).
- **Посты блога**: 3 файла в `content/blog/*.mdx` (о бренде / основатель / история) с frontmatter (title, slug, date, excerpt, gradient, author). Правятся вручную (БД-редактор — Фаза 6). e2e `smoke.spec.ts` пинит число постов (3) и `POST_SLUG='o-brende-tanar'`.
- **Язык**: только русский
- **Картинки-фолбэк**: для товаров без фото — CSS-градиенты из мягкой outdoor-палитры (земляные, пыльно-синие, серо-зелёные) + текст-метка с названием. Блог — пока на градиентах.

## Дизайн

Outdoor-вайб, между Patagonia и Arc'teryx. Мягкие земляные тона, строгая типографика, много воздуха. Детали теплоты/холода докручиваются позже — не блокеры для v1.

## Правила работы с task_tracker

Стандарт из `~/.claude/CLAUDE.md`:

- Каждый план = папка в `task_tracker/todo/<название>/`
- `PLAN.md` — мастер-файл
- `step_N_name.md` ≤ 300 строк, с проверяемыми критериями (команды, не слова)
- После завершения всех шагов — папка переезжает в `task_tracker/done/`
- Фаза 1 завершена целиком (admin auth + editing + CRUD + media). Дальше — Фаза 2 (остатки/инвентарь), см. `task_tracker/backlog/ARCHITECTURE-ecommerce.md`.

## Ralph loop

Для автономного исполнения плана используется `ralph.ps1` (адаптирован из gpx-predict).

```powershell
.\ralph.ps1 -PlanFile task_tracker/todo/phase-0-foundation/PLAN.md -MaxIterations 30
```

Критерии завершения итерации — в каждом step-файле. Критерий завершения всего loop — все шаги в PLAN.md помечены `[x]`, и Ralph выводит `<promise>COMPLETE</promise>`.

## Git

- `main` — стабильная
- `dev` — сюда коммитит Ralph
- Коммиты на английском, Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- Remote: `https://github.com/renatmannanov/tanar-site.git`
