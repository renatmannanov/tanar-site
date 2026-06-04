# Progress Log — Prod Deploy

## Целевой сервер (стратегия выбрана 2026-06-01)
- **СЕЙЧАС (демо/тест для клиента): существующий VPS Hetzner.** Разворачиваем по шагам 1–7 как есть (план провайдеро-независим, любой Ubuntu VPS). Цель — показать заказчице живой рабочий вариант на домене.
- **ПОТОМ (боевой, после согласования с заказчицей): переезд на PS.kz.** Локально в КЗ — латентность + местные требования к хранению данных. Переезд = **шаг 11** (бэкап на Hetzner → restore на PS.kz → переключить DNS). Архитектура (Docker + named volumes) к переезду готова, код менять не нужно.
- **Сервер ставим САМИ с нуля** (оба провайдера дают чистый Ubuntu). Предустановленного Caddy/nginx на хосте нет → наш **Caddy в Docker** работает как в плане, порты 80/443 свободны.
- **Серверную «оптимизацию картинок» НЕ применяем** (даже если провайдер предлагает): sharp в приложении уже делает 3×WEBP. Стороннее сжатие = двойная работа/потеря качества. Caddy только проксирует + TLS.
- **Переносимость заложена:** `COMPOSE_PROJECT_NAME=tanar-site` (детерминированное имя volume на любом сервере), бэкап-скрипт (шаг 8) двойного назначения — и авария, и переезд. Сделать шаг 8 ДО переезда.

## Контекст для агента (факты из кода, проверено 2026-06-01)

### Сборка / Next.js
- `next.config.ts`: сейчас `images.unoptimized: true`, `experimental.serverActions.bodySizeLimit: '10mb'`. **Шаг 1 добавляет `output: 'standalone'`** (рядом, верхний уровень конфига).
- Сборка: `next build --turbopack` (есть в package.json `build`). Turbopack + standalone — проверить, что `.next/standalone` создаётся (на старых версиях standalone был только webpack; Next 15.5 — поддерживает, но ПРОВЕРИТЬ артефакт после build).
- `engines.node: ">=20 <21"` → база образа node:20.
- **standalone-грабли:** `.next/standalone` НЕ включает `public/` и `.next/static` — их надо КОПИРОВАТЬ в образ вручную (`COPY --from=builder /app/public ./public` и `/app/.next/static ./.next/static`). Это известная особенность; без неё CSS/картинки/иконки 404.
- Запуск standalone: `node server.js` (генерится в `.next/standalone/server.js`), слушает `PORT` (по умолчанию 3000), `HOSTNAME=0.0.0.0` нужен внутри контейнера.

### sharp (риск шага 1)
- `sharp@^0.34.5` в deps. Используется в `src/core/media/store.ts` (server-only). Гонит загруженные фото → 3×WEBP.
- **НА ALPINE sharp/libvips ненадёжен** (musl, prebuilt). Зафиксировано: база образа **`node:20-slim`** (Debian glibc), НЕ `node:20-alpine`. На slim prebuilt sharp ставится штатно.
- Проверка sharp в контейнере — реальной загрузкой фото через админку (шаг 1/7), не просто стартом.

### БД / Drizzle
- `src/core/db/client.ts`: читает `process.env.DATABASE_URL`, `postgres(url, {max:10})`. Падает если url не задан.
- Миграции: `src/core/db/migrations/` (есть `0000_*.sql`, `0001_*.sql`, `meta/`). Применять `drizzle-kit migrate` (`db:migrate`).
- `drizzle.config.ts`: грузит `.env.local` через dotenv, читает `DATABASE_URL`. **На проде .env.local нет** — drizzle-kit на проде надо запускать с прод-DATABASE_URL в окружении (env-файл прода или inline). Учесть в шаге 5.
- **drizzle-kit и tsx — это devDependencies.** В standalone-образе их НЕТ. Миграции на проде гонять либо отдельной стадией/командой с dev-зависимостями, либо из отдельного «migrate»-контейнера. Зафиксировать в шаге 5 (вариант: одноразовый `docker run` с полным образом-билдером, ИЛИ `npm ci` + migrate в отдельном шаге деплоя). РЕШЕНИЕ для шага 5 — там.

### Сид (шаг 6)
- `npm run db:seed` = `tsx --env-file=.env.local -r tsconfig-paths/register src/core/db/seed.ts`.
- `seed.ts` GUARD (строка ~16): `if (!/tanar_dev|tanar_test/.test(DATABASE_URL)) throw`. **Шаг 6 ослабляет:** пускать при `process.env.ALLOW_PROD_SEED === '1'` ДАЖЕ если url не dev/test. Иначе — guard как есть.
- `seed.ts` делает `TRUNCATE products, product_variants, skus, media_assets CASCADE` → импорт 12 товаров через `createProduct`. **Деструктивно** — на проде ТОЛЬКО разово на чистой БД, под подтверждение.
- Снапшот: `task_tracker/done/real-catalog-import/catalog-snapshot.json` (12/30/109). Должен попасть в образ ИЛИ быть доступен при сиде. tsx/seed.ts + снапшот + tsconfig-paths нужны в среде запуска сида (как и drizzle — это НЕ standalone-рантайм).
- Self-check в сиде: ждёт price=80000 у `jacket-sv7-goretex`, article `TANAR-001`. Не трогать.

### Фото / media_assets (шаг 9)
- `media_assets` (schema.ts ~103): `id, scope('product'), url, sortOrder, productId(FK→products,cascade), variantId(FK→productVariants,cascade), view, model, role('lifestyle'), key, alt, createdAt`.
- Имена файлов: `<uuid>-<width>.webp`, width ∈ {1600,800,400}. URL в БД = `/images/products/<slug>/<uuid>-1600.webp` (только 1600-вариант в `url`; остальные ширины выводятся `urlForWidth`). Файлы лежат в `public/images/products/<slug>/`.
- `sortOrder` = max(existing для variantId)+1. role всегда `'lifestyle'` для загрузок.
- **CLI push-media (шаг 9)** должен: положить 3 ширины webp на прод-диск (в volume product-images) + вставить ОДНУ строку media_assets на фото (url=1600), с правильными productId/variantId (резолв по slug→colorId). Идемпотентность: не вставлять, если такой url уже есть.

### Caddy / SSL / DNS (шаг 3, 7)
- Caddy выдаёт сертификат Let's Encrypt автоматически — НО только когда A-запись домена УЖЕ указывает на IP VPS и порты 80/443 открыты. **Порядок: DNS → деплой → первый https-запрос** (иначе ACME-challenge падает). Зафиксировать в шаге 7.
- Caddy reverse_proxy на `web:3000` (имя сервиса в compose-сети).
- `bodySizeLimit '10mb'` в Next — Caddy по умолчанию тело НЕ режет (нет аналога client_max_body_size как у nginx по умолчанию). Но ПРОВЕРИТЬ: если добавим `request_body max_size` — поставить ≥10mb. По умолчанию не ставить лимит.

### Middleware (риск)
- `src/middleware.ts`: `runtime: 'nodejs'`, `matcher: ['/admin/:path*']`. В standalone node-runtime middleware работает. Проверить на проде, что `/admin/*` редиректит на login (шаг 7).

### Env (шаг 4)
- `.env.example` (dev): `DATABASE_URL`, `DATABASE_TEST_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
- `ADMIN_SESSION_SECRET` ≥32 символа (иначе admin-auth throw). Генерация: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- Прод `DATABASE_URL` → на postgres-КОНТЕЙНЕР: `postgres://<user>:<pw>@postgres:5432/<db>` (имя сервиса `postgres`, внутренний порт 5432, НЕ 5442 — 5442 это host-маппинг только локально).
- `.env*` в `.gitignore` (кроме `.env.example`). Прод-секреты — только на сервере, не в git.

### Git
- main=прод, dev=рабочая. Сейчас всё на dev. Перед деплоем — решить про merge в main (отдельно, по git-протоколу `~/.claude/CLAUDE.md`; план НЕ вливает автоматически).
- Существующий dev `docker-compose.yml` — это локальная dev/test БД (порты 5442/5443). **Прод-compose — ОТДЕЛЬНЫЙ файл** `docker-compose.prod.yml`. Dev-compose не трогать.

## Learnings

### 2026-06-04 — шаги 1–6 (артефакты), сессия деплоя
- **railway.json удалён** (git rm) — переезжаем на свой Docker/Caddy. Остальные railway-упоминания только в текстах планов/ревью, их не трогаем.
- **Ленивый db-клиент (ФИКС открытого риска ревью #8).** `src/core/db/client.ts` раньше бросал `DATABASE_URL is not set` на ВЕРХНЕМ уровне модуля. Это валило `docker build` (`Failed to collect page data for /...`): Next на сборке импортирует модули страниц даже force-dynamic, и top-level throw в цепочке импортов → build exit 1. **Решение:** ленивая инициализация через геттеры + `Proxy` (`db`, `queryClient` создаются при первом доступе, throw отложен в рантайм). Все вызовы (`db.select`, `db.$count`, `queryClient.end`) работают без изменений (`.bind` сохраняет this). Проверено: build БЕЗ DATABASE_URL проходит; рантайм-запрос к dev-БД отдаёт 12 товаров.
  - Грабли воспроизведения: локальный `npm run build` ВИДИТ `.env.local` (Next грузит сам), поэтому `env -u DATABASE_URL` мало — для повтора прячь `.env.local` (`mv .env.local .env.local.bak`).
- **drizzle-env (ФИКС открытого риска ревью #4) — ЗАКРЫТ.** `drizzle.config.ts` читает `process.env.DATABASE_URL` напрямую (стр. 13). `dotenv.config({path:'.env.local'})` на проде, где файла нет, НЕ бросает (возвращает `{error: ENOENT}`, конфиг это не проверяет) → url берётся из окружения контейнера. Миграции на проде сработают при DATABASE_URL в env. Подтвердить прогоном `migrate`-сервиса на шаге 5/7.
- **seed.ts предохранитель (шаг 6) сделан:** env-guard ослаблен под `ALLOW_PROD_SEED=1` (inline), + физический предохранитель в `main()`: при prod-флаге и не-dev/test url — отказ если `count(products)>0`. Dev/test flow (TRUNCATE+reseed) не затронут.
- **CRLF/LF:** `docker-entrypoint.sh` — LF (нормализован `sed`), `.gitattributes` пинит `*.sh eol=lf`. Иначе shebang `/bin/sh` в контейнере споткнётся.
- **Образ:** `tanar-web:local`, runner-стадия. tools-сервисы — `target: builder`.
- Артефакты созданы: `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `.gitattributes`, `docker-compose.prod.yml`, `Caddyfile`, `.env.prod.example`. next.config — `output:'standalone'`.
---
