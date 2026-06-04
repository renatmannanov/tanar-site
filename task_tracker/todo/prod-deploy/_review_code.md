# Review: Code

## Критичное (блокирует выполнение)

### 1. `src/core/db/seed.ts` — guard на верхнем уровне модуля (шаг 6)
**Файл:** `src/core/db/seed.ts`, строки 16–21.

Guard выполняется при **импорте модуля**, а не внутри функции `main()`. Это означает, что добавление `ALLOW_PROD_SEED` внутри блока guard (как написано в шаге 6а) работает корректно — флаг проверяется до throw. Никакого риска нет. Но есть нюанс: `process.env` читается в момент импорта, до запуска `main()`. Если переменная передана через `docker compose run -e ALLOW_PROD_SEED=1`, она будет в окружении с самого старта процесса — всё ок. **Не блокер, но убедиться что реализация точно соответствует шаблону шага 6а.**

### 2. `scripts/push-media.ts` — `urlForWidth` дублирована в двух местах (шаг 9)
**Файлы:** `src/core/media/store.ts` (строка 41) и `src/core/media/client.ts` (строка 11).

Шаг 9 требует «вынести генерацию ширин в общую функцию, чтобы CLI и store не разъезжались» — это правильно. Но на практике `urlForWidth` уже **дублирована** в `store.ts` и `client.ts`. CLI `scripts/push-media.ts` будет третьей копией, если не навести порядок при реализации шага 9. Если рефакторинг не сделать — конвенция именования файлов (`<uuid>-<width>.webp`) и URL (`-1600.webp` как primary) могут разъехаться между инструментами. **Шаг 9 должен явно включить этот рефакторинг**, иначе push-media CLI будет четвёртой независимой реализацией.

---

## Важное (стоит исправить до начала)

### 3. Turbopack + `output: 'standalone'` — проверено, работает (но требует подтверждения артефакта)
**Файл:** `package.json` (скрипт `build`), `node_modules/next/dist/build/index.js`.

Проверено по исходнику Next.js 15.5.15: проверка `config.output === 'standalone'` и вызов `writeStandaloneDirectory` расположены **после** обеих веток (turbopack и webpack), т.е. standalone создаётся в обоих случаях. `node_modules/next/dist/build/turbopack-build/index.js` не содержит собственной standalone-логики — она в общем `build/index.js`.

**Риск остаётся практическим:** `.next/standalone` реально создаётся только если трассировка файлов (`nftTracing`) отработала корректно. В шаге 1 в критериях готовности стоит `docker build` без ошибок — этого достаточно, так как Docker-сборка (`RUN npm run build`) выполняется в Linux-контейнере (не Windows), где turbopack + standalone стабильны.

**Действие:** В Dockerfile добавить smoke-проверку что `.next/standalone/server.js` существует после `npm run build`, прежде чем переходить к стадии runner. Иначе `COPY --from=builder /app/.next/standalone ./` молча скопирует пустую папку или упадёт с неясной ошибкой.

```dockerfile
# В конце builder-стадии, перед COPY в runner:
RUN test -f .next/standalone/server.js || (echo "ERROR: standalone not built" && exit 1)
```

### 4. `drizzle.config.ts` — `DATABASE_URL!` (non-null assertion) падает если переменная не задана
**Файл:** `drizzle.config.ts`, строка 13.

`url: process.env.DATABASE_URL!` — TypeScript assertion, в рантайме это просто `undefined`. Если drizzle-kit запустить в `migrate`-сервисе без `DATABASE_URL` в env, падение будет неочевидным (`Error: Invalid URL` где-то внутри drizzle-kit, не `DATABASE_URL is not set`).

Шаг 5 это учитывает (`DATABASE_URL подаём через -e/env сервиса migrate`) и проверяет что `dotenv.config` с несуществующим `.env.local` не падает — это ок (dotenv молча игнорирует отсутствующий файл, проверено). Но в критериях шага 5 нет явной проверки «что будет если env не задан» — добавить тест: запустить `migrate` без `DATABASE_URL` и убедиться в читаемой ошибке. Не блокер, но неочевидная точка отказа.

### 5. `src/core/db/client.ts` — `throw` на верхнем уровне при отсутствии `DATABASE_URL`
**Файл:** `src/core/db/client.ts`, строки 5–6.

`if (!url) throw new Error('DATABASE_URL is not set')` — выполняется при импорте. Это значит: `builder`-стадия Docker (`npm run build`) не нуждается в `DATABASE_URL` только если все импорты с `client.ts` защищены `'use server'` / `force-dynamic`. Проверяется что `next build --turbopack` не падает без `DATABASE_URL` (в Dockerfile DATABASE_URL не передаётся на стадии сборки). Фактически: `force-dynamic` на всех страницах витрины есть, но **сам `npm run build` импортирует маршруты статически** для анализа. Если хоть один серверный компонент импортирует `@/core/catalog` (который через `repository.ts` → `client.ts`) на верхнем уровне без `dynamic = 'force-dynamic'` — build упадёт с `DATABASE_URL is not set`.

**Проверить**: Шаг 1 требует `docker build -t tanar-web:local .` без передачи `DATABASE_URL` как build-arg. Если build сейчас работает локально без БД (что подразумевает `force-dynamic`-защита) — проблемы нет. Но это нигде явно не верифицировано в плане. **Добавить в критерии шага 1:** `docker build` выполняется БЕЗ `--build-arg DATABASE_URL` и проходит.

### 6. Именование volume в `backup.sh` (шаг 8)
**Файл:** `task_tracker/todo/prod-deploy/step_8_backups.md`, строка 13.

Скрипт использует `tanar-site_product-images` как имя volume. Docker Compose формирует имя volume как `<project_name>_<volume_name>`. Имя проекта берётся из:
1. `--project-name` флага
2. `COMPOSE_PROJECT_NAME` env
3. Имени папки где лежит compose-файл

На VPS папка будет `tanar-site` (клонируется `git clone ... tanar-site`), поэтому `tanar-site_product-images` — корректно. Но это хрупко: если клонировать в другую папку (`tanar` или `app`) — volume-имя сменится и бэкап-скрипт сломается. **Добавить в `backup.sh` динамическое определение имени volume** через `docker volume ls` или захардкодить через `COMPOSE_PROJECT_NAME=tanar-site` в `.env` (compose-проект будет предсказуем).

---

## Мелочи (можно по ходу)

### 7. `db:seed` скрипт использует `--env-file=.env.local` (шаг 6б)
**Файл:** `package.json`, строка 20.

`npm run db:seed` = `tsx --env-file=.env.local ...`. В docker `seed`-сервисе план запускает `npx tsx -r tsconfig-paths/register src/core/db/seed.ts` без `--env-file`. Это правильно — DATABASE_URL приходит через docker env. Но `tsconfig-paths/register` — devDependency, в builder-образе он есть (полный `node_modules`). Никакого риска, просто убедиться что команда в шаге 6б именно такая (без `--env-file`).

### 8. `.env.prod.example` не покрывается `!.env.example` в `.gitignore` (шаг 4)
**Файл:** `.gitignore`, строка 36.

Текущее правило: `.env*` игнорится, `!.env.example` — исключение. Шаг 4 явно указывает добавить `!.env.prod.example`. **Это уже учтено в плане.** Просто убедиться что команда `git check-ignore .env.prod.example` проверяется ПОСЛЕ правки `.gitignore`.

### 9. `reset.ts` — guard идентичен `seed.ts` и тоже не имеет `ALLOW_PROD_SEED`
**Файл:** `src/core/db/reset.ts`, строки 5–9.

Если кто-то случайно запустит `db:reset` в prod-окружении (маловероятно, но возможно), guard сработает. Шаги плана `reset.ts` не затрагивают — правильно.

### 10. `process.cwd()` в `store.ts` и будущем CLI
**Файл:** `src/core/media/store.ts`, строка 22.

`PUBLIC_PRODUCTS_DIR = path.join(process.cwd(), 'public', 'images', 'products')`. В standalone-контейнере `cwd` при запуске `node server.js` = `/app` (где лежит `server.js`). Volume монтируется в `/app/public/images/products`. Это совпадает — всё корректно. CLI `push-media.ts` при локальном запуске будет иметь другой `cwd`. Шаг 9 должен учитывать это при записи файлов (через `docker cp`, а не `process.cwd()` — план это предусматривает).

### 11. `DOMAIN` env-переменная не используется Next.js приложением
**Файл:** `.env.prod.example` (шаг 4).

`DOMAIN=tanar.kz` нужен только Caddy (`{$DOMAIN}` в Caddyfile). Next.js его не читает. Не проблема, просто документировать это чётче чтобы не было confusion.

---

## Не найдено проблем (всё ок)

- **Turbopack + standalone:** В Next.js 15.5.15 `writeStandaloneDirectory` вызывается после обеих compile-веток (turbopack и webpack), поэтому `.next/standalone` создаётся в обоих случаях. Риск из `progress.md` задокументирован верно, и он устранён самой архитектурой Next.js.
- **`node:20-slim` vs alpine:** Зафиксировано правильно. `sharp@^0.34.5` в `dependencies` (не devDeps) — попадёт в `runner`-стадию при `npm ci --omit=dev`. Нет.
- **sharp в `dependencies`, не `devDependencies`:** Верно, sharp нужен в рантайме.
- **`drizzle-kit` и `tsx` в `devDependencies`:** Верно. В builder-стадии `npm ci` (без `--omit=dev`) они есть; в runner-стадии через `npm ci --omit=dev` — не нужны.
- **E2e тесты (`afterAll db:seed`):** `admin.spec.ts`, `admin-crud-media.spec.ts`, `storefront-completion.spec.ts` вызывают `npm run db:seed` в afterAll. Скрипт читает `.env.local` → DATABASE_URL содержит `tanar_dev` → guard проходит. Ослабление guard через `ALLOW_PROD_SEED` не меняет путь кода для dev/test URL — e2e не затронуты.
- **`middleware.ts` runtime: 'nodejs':** В standalone корректно работает. Нет Edge Runtime ограничений.
- **`dotenv.config({ path: '.env.local' })` в `drizzle.config.ts`:** При отсутствии `.env.local` на проде dotenv молча пропускает (не бросает исключение). DATABASE_URL берётся из окружения контейнера. Подтверждено по исходнику dotenv.
- **Dev `docker-compose.yml` не затрагивается:** Прод-compose в отдельном файле `docker-compose.prod.yml`. `npm run db:up/down` продолжают работать с `docker-compose.yml`.
- **Снапшот `catalog-snapshot.json` в builder-стадии:** `Dockerfile` копирует весь исходник в builder → файл `task_tracker/done/real-catalog-import/catalog-snapshot.json` будет в образе если не исключён `.dockerignore`. Шаг 1 явно добавляет исключение `!task_tracker/done/real-catalog-import/` — конвенция `seed.ts` (`resolve(here, '../../../task_tracker/done/...')`) совпадает с расположением файла относительно `src/core/db/seed.ts`. Путь корректен.
- **`media_assets` схема:** `url`, `scope`, `role`, `productId`, `variantId`, `sortOrder`, `alt` — все поля есть, типы совпадают с описанием шага 9.
