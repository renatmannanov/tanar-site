# Шаг 2: docker-compose.prod.yml (web + postgres + caddy + tools)

> Зависит от: шаг 1 (образ web + builder-стадия), шаг 3 (Caddyfile — можно писать параллельно, но `up` целиком проверяется после шага 3).
> Статус: [ ] pending

## Задача

Прод-композиция. ОТДЕЛЬНЫЙ файл `docker-compose.prod.yml` (dev `docker-compose.yml` не трогать).

> **ВАЖНО (ревью): этот шаг — ЕДИНСТВЕННЫЙ, кто описывает compose.** Все сервисы, включая one-off tools (`migrate`, `seed`, `push-media`), определяются ЗДЕСЬ под `profiles: ["tools"]`. Шаги 5/6/9 их только ЗАПУСКАЮТ (`--profile tools run`), а НЕ правят этот файл. Так исполнитель шага 2 сразу создаёт полный файл, и поздних дописываний нет.

### Сервисы (рантайм — стартуют по умолчанию)
1. **postgres** (`postgres:16-alpine`):
   - env: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — из `.env` (через `${VAR}`), НЕ хардкод.
   - volume: `pgdata:/var/lib/postgresql/data`.
   - healthcheck: `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` (interval 5s, retries 5).
   - порт наружу НЕ публиковать. Внутри слушает 5432.
   - `restart: unless-stopped`.
2. **web** (`build: .`, образ runner-стадии):
   - env (из `.env`): `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
     - **DATABASE_URL берётся ЦЕЛИКОМ из `.env`** (не собирать в compose из частей — рассинхрон пароля, см. шаг 4). Значение: `postgres://${POSTGRES_USER}:<тот же пароль>@postgres:5432/${POSTGRES_DB}`.
   - volume: `product-images:/app/public/images/products` (persistent фото — главное прод-требование).
   - `depends_on: postgres (condition: service_healthy)`.
   - порт наружу НЕ публиковать. Внутри слушает 3000.
   - `restart: unless-stopped`.
3. **caddy** (`caddy:2-alpine`):
   - порты: `80:80`, `443:443` (единственный сервис наружу).
   - **`environment: ["DOMAIN=${DOMAIN}"]`** — ОБЯЗАТЕЛЬНО (Caddyfile использует `{$DOMAIN}`; без передачи env в контейнер caddy переменная пустая → сертификат не выпустится). Это фикс ревью.
   - volumes: `./Caddyfile:/etc/caddy/Caddyfile:ro`, `caddy-data:/data` (сертификаты — persistent, иначе перевыпуск → rate-limit LE), `caddy-config:/config`.
   - `depends_on: web`.
   - `restart: unless-stopped`.

### One-off tools-сервисы (profile `tools` — НЕ стартуют при обычном `up`)
Образ — **builder-стадия** (в ней есть tsx/drizzle-kit/исходник/снапшот; см. шаг 1). Задать `build: { context: ., target: builder }` ИЛИ `image: tanar-migrator:local`. Зафиксировано: `build` с `target: builder` (один источник, без отдельного тега).
Все три читают `.env` (env_file или `${VAR}`), `DATABASE_URL` указывает на `postgres:5432`. `depends_on: postgres (healthy)`.

4. **migrate** (profile `tools`): `command: npx drizzle-kit migrate`. Запуск — шаг 5.
5. **seed** (profile `tools`): `command: npx tsx -r tsconfig-paths/register src/core/db/seed.ts`. **НЕ задавать `ALLOW_PROD_SEED` в compose/.env** — флаг передаётся ТОЛЬКО inline в момент запуска (`-e ALLOW_PROD_SEED=1`, шаг 6), чтобы он не «жил» в окружении и не выстрелил повторно. Запуск — шаг 6.
6. **push-media** (profile `tools`): `command: npx tsx -r tsconfig-paths/register scripts/apply-media-manifest.ts` (скрипт создаётся в шаге 9). Запуск — шаг 9.

### Volumes (named, верхний уровень)
`pgdata`, `product-images`, `caddy-data`, `caddy-config`.

### Имя проекта (детерминированное имя volume)
В `.env`: `COMPOSE_PROJECT_NAME=tanar-site` (фикс ревью). Тогда volume фото всегда `tanar-site_product-images` независимо от имени папки клона — на это опирается backup.sh (шаг 8). Без него имя зависит от папки → пустой бэкап.

### Права на volume product-images (ФИКС ревью — один механизм, без альтернатив)
`chown` в образе НЕ покрывает содержимое volume (Docker монтирует volume как root ПОВЕРХ папки). Зафиксированное решение: **web запускается через entrypoint-обёртку, которая от root делает `chown -R node:node /app/public/images/products`, затем `exec` приложения от node** (gosu/su-exec). Детали entrypoint — в шаге 1 (Dockerfile). Здесь: убедиться, что web стартует этим entrypoint. (Это единственный механизм; вариант «web от root» отвергнут — менее secure.)

### Env-файл
Compose читает `.env` в корне на проде (gitignored). Локально для теста — временный `.env` с тест-значениями (вкл. `COMPOSE_PROJECT_NAME=tanar-site`, `DOMAIN=localhost` для :80-режима).

## Тесты
- Локально поднять рантайм-стек (`up`, без profile tools), проверить:
  - postgres healthy, web стартует после него; витрина отвечает (через caddy :80-режим, см. шаг 3);
  - volume сохраняет данные после `down` (без `-v`) → `up`;
  - загрузка фото не падает EACCES (entrypoint chown отработал) — проверяется на шаге 7 на проде, локально — если есть БД с товаром.
- tools-сервисы при обычном `up` НЕ стартуют (только `--profile tools run`).

## Команды для верификации
```powershell
# Рантайм-стек (tools НЕ стартуют):
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps   # web/postgres/caddy running/healthy; migrate/seed/push-media НЕ в списке
# Имя volume детерминировано:
docker volume ls | Select-String "tanar-site_product-images"
# Персистентность:
docker compose -f docker-compose.prod.yml down   # БЕЗ -v
docker compose -f docker-compose.prod.yml up -d  # данные на месте
# tools-сервис описан и вызывается (smoke, без реальной миграции):
docker compose -f docker-compose.prod.yml --profile tools config --services   # включает migrate/seed/push-media
```

## Критерии готовности
- [ ] `docker-compose.prod.yml`: web+postgres+caddy (рантайм) + migrate/seed/push-media (profile `tools`), все env через `${VAR}` (нет хардкода секретов)
- [ ] caddy получает `DOMAIN` через environment (иначе SSL не выпустится)
- [ ] tools-сервисы используют builder-стадию (`target: builder`), НЕ стартуют при обычном `up`
- [ ] `seed`-сервис НЕ содержит `ALLOW_PROD_SEED` в окружении (только inline при запуске)
- [ ] `COMPOSE_PROJECT_NAME=tanar-site` → volume `tanar-site_product-images` детерминирован
- [ ] web стартует через entrypoint, делающий chown volume фото (нет EACCES)
- [ ] Named volumes `pgdata`, `product-images`, `caddy-data`, `caddy-config` объявлены
- [ ] postgres и web НЕ публикуют порты наружу; наружу только caddy
- [ ] `down` (без `-v`) → `up` сохраняет данные volume
- [ ] Коммит: `chore(deploy): production docker-compose (web+postgres+caddy+tools)`
