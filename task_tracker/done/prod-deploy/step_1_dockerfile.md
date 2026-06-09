# Шаг 1: Dockerfile (Next.js standalone, node:20-slim, sharp)

> Зависит от: нет.
> Статус: [ ] pending

## Задача

Собрать прод-образ Next.js через standalone-output. База — `node:20-slim` (Debian, glibc) ради надёжного sharp.

### 1а. `next.config.ts` — добавить standalone
Добавить на верхний уровень конфига (рядом с `images`/`experimental`):
```ts
output: 'standalone',
```
Остальное не трогать (`images.unoptimized`, `serverActions.bodySizeLimit` остаются).

### 1б. `.dockerignore` (новый, в корне)
Исключить из контекста сборки: `node_modules`, `.next`, `.git`, `e2e`, `test-results`, `playwright-report`, `.env*`, `internal`, `assets`, `scratch`, `logs`, `task_tracker`.
- **НЕ игнорить** (нужны в build): `content/` (MDX блога — копируется в runner), исходник, `public/`, `drizzle.config.ts`, `tsconfig*.json`.
- **Снапшот сида:** `task_tracker/` игнорируется целиком, КРОМЕ снапшота — добавить исключение `!task_tracker/done/real-catalog-import/` и `!task_tracker/done/real-catalog-import/catalog-snapshot.json` (порядок в .dockerignore важен: сначала `task_tracker`, потом `!`-исключения). Снапшот нужен builder-стадии (сид, шаг 6).

### 1в. `Dockerfile` (новый, в корне) — multi-stage
Стадии:
1. **deps** (`node:20-slim`): `COPY package.json package-lock.json`, `npm ci`. (sharp подтянет prebuilt под linux-x64-glibc — на slim ставится штатно.)
2. **builder** (`node:20-slim`): копировать `node_modules` из deps + весь исходник, `RUN npm run build`. Проверить, что создаётся `.next/standalone`.
2.5 **standalone-guard (в builder, ФИКС ревью):** после `npm run build` добавить `RUN test -f .next/standalone/server.js` — падать на СБОРКЕ, если Turbopack не создал standalone-артефакт (а не молча получить рантайм без server.js). Подтверждено по исходнику Next 15.5.15, что артефакт создаётся при `--turbopack`, но guard страхует от регрессий версии.
3. **runner** (`node:20-slim`): 
   - `ENV NODE_ENV=production`, `ENV HOSTNAME=0.0.0.0`, `ENV PORT=3000`.
   - Копировать standalone-артефакт + public + static + **content** (MDX блога читается `fs` в рантайме — без него `/blog` упадёт; ФИКС ревью):
     - `COPY --from=builder /app/.next/standalone ./`
     - `COPY --from=builder /app/public ./public`
     - `COPY --from=builder /app/.next/static ./.next/static`
     - `COPY --from=builder /app/content ./content`
   - `EXPOSE 3000`.
   - **Права на volume product-images (ФИКС ревью — один механизм):** volume монтируется как root ПОВЕРХ папки, поэтому `chown` в образе на содержимое volume НЕ распространяется. Решение — **entrypoint-скрипт**, который при старте контейнера (от root) делает `chown -R node:node /app/public/images/products`, затем сбрасывает привилегии и запускает приложение от node:
     - Поставить `gosu` (или `su-exec`): `RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*`.
     - `docker-entrypoint.sh` (новый файл, копируется в образ, `chmod +x`):
       ```sh
       #!/bin/sh
       set -e
       # volume mount is root-owned on first up; make it writable for node (sharp uploads)
       chown -R node:node /app/public/images/products 2>/dev/null || true
       exec gosu node node server.js
       ```
     - `ENTRYPOINT ["/app/docker-entrypoint.sh"]` (без отдельного CMD — entrypoint сам стартует server.js).
   - Базовая папка фото должна существовать в образе, чтобы chown не падал: `RUN mkdir -p /app/public/images/products`.

> **Разделение образов:** runner (standalone) — ТОЛЬКО рантайм витрины/админки, НЕ содержит tsx/drizzle-kit/seed.ts/снапшот. Миграции (шаг 5) и сид (шаг 6) гоняются из **builder-стадии** (в ней есть весь исходник + node_modules + снапшот) через tools-сервисы compose (шаг 2). Зафиксировано: runner не тащит снапшот; tools — из builder.

## Тесты
- Локально собрать образ и запустить (с временной БД), убедиться что:
  - образ собирается без ошибок;
  - контейнер стартует (`node server.js` слушает 3000);
  - sharp не падает (проверка — в шаге 2/7 при загрузке фото; здесь достаточно, что `require('sharp')` не кидает при старте).
- Существующее ничего не ломается (Dockerfile — новый файл; `output:'standalone'` не влияет на `next dev`).

## Команды для верификации
```powershell
# Сборка образа БЕЗ DATABASE_URL в окружении (ФИКС ревью: build не должен импортировать
# client.ts, который throw'ит на отсутствие url — force-dynamic это обеспечивает):
docker build -t tanar-web:local .
# (если build падает на DATABASE_URL — значит что-то импортирует db на этапе сборки, разобрать)
# standalone-guard уже внутри build (RUN test -f .next/standalone/server.js) — build упадёт, если артефакта нет.
# sharp работает на slim:
docker run --rm tanar-web:local gosu node node -e "require('sharp'); console.log('sharp OK')"
# Старт без БД упадёт на DATABASE_URL в рантайме — это ОК; БД подаём в шаге 2.
```

## Критерии готовности
- [ ] `output: 'standalone'` в next.config.ts; `next dev` по-прежнему работает (не ломается)
- [ ] `.dockerignore` создан; снапшот сида не исключён (исключение прописано)
- [ ] `Dockerfile` multi-stage на `node:20-slim`; копирует standalone + public + .next/static + **content**
- [ ] standalone-guard: `RUN test -f .next/standalone/server.js` в builder (падает если артефакта нет)
- [ ] entrypoint chown'ит `/app/public/images/products` и запускает server.js через gosu от node
- [ ] `docker build` проходит **без `DATABASE_URL`** в окружении (build не тянет db-клиент)
- [ ] `docker run ... gosu node node -e "require('sharp')"` печатает `sharp OK`
- [ ] Коммит: `chore(deploy): Dockerfile + standalone output for prod build`
