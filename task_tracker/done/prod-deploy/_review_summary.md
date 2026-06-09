# Review Summary — prod-deploy

> Дата: 2026-06-01
> Ревью: code + risks + structure (3 агента, sonnet)

## Критичное (блокирует / необратимо / неверный результат)

1. **ALLOW_PROD_SEED — повторный запуск уничтожает каталог** (risks #1). Флаг остаётся в env после первого сида; повторный `seed` → `TRUNCATE ... CASCADE` сносит каталог + media_assets (фото-привязки). Бэкап (шаг 8) к тому моменту может не существовать. → **Нужен физический предохранитель, не только текст: seed.ts должен дополнительно проверять, что БД пустая (count(products)==0), иначе отказ даже с флагом. + флаг НЕ хранить в .env, передавать только inline в момент запуска.**

2. **Сервисы `migrate`/`seed` (и `push-media`) не определены в compose** (structure #1, #3). Шаг 2 создаёт compose с web+postgres+caddy. Шаги 5/6/9 «добавляют сервисы» — но не сказано, что они дополняют файл шага 2. Исполнитель шага 2 закоммитит без них, на шаге 5 затык. → **Зафиксировать: ВСЕ tools-сервисы (migrate/seed/push-media) определяются СРАЗУ в шаге 2 под `profile: tools`. Шаги 5/6/9 только используют их, не правят compose.**

3. **`{$DOMAIN}` не передаётся в caddy-контейнер** (structure #6). Caddyfile использует `{$DOMAIN}`, но в шаге 2 у сервиса caddy нет `environment`/`env_file` → переменная пустая → SSL не выпустится. → **Шаг 2: caddy получает `environment: [DOMAIN]` (или env_file). Зафиксировать.**

4. **drizzle-kit без .env.local на проде — не верифицировано** (risks #2, structure #5). `drizzle.config.ts` грузит `.env.local`; на проде его нет. Помечено «ПРОВЕРИТЬ» — открытый вопрос. Если DATABASE_URL не подхватится из окружения → миграции не применятся → 500 на всех dynamic-страницах. → **Закрыть ДО старта: проверить локально (DATABASE_URL в env, без .env.local) что drizzle-kit видит url; записать как факт. Если нет — поправить drizzle.config.ts (читать process.env.DATABASE_URL напрямую, dotenv опционально).**

5. **merge dev→main — предусловие без шага** (risks #5, structure #2). Сейчас всё на dev, main пустой/старый. Шаг 7в делает `git checkout main` → развернёт устаревший код, build пройдёт без ошибки, проблема всплывёт только функционально. → **Шаг 7: merge dev→main — ПЕРВЫЙ пункт-предусловие с командой проверки (`git log main --oneline -3` должен показать коммиты Фаз 1.5 + deploy). Деплоить только после.**

6. **Права volume product-images → EACCES для sharp** (risks #3, structure #4). `chown` в образе не покрывает содержимое volume (Docker монтирует как root поверх). Решение дано как «две альтернативы / при необходимости» — не зафиксировано. Загрузка фото на проде упадёт EACCES. → **Зафиксировать ОДИН механизм: init-команда в web (entrypoint `chown -R node:node /app/public/images/products` от root перед стартом), ИЛИ запускать web от root (проще, но менее secure). Выбрать один и прописать в шаге 1+2 без «при необходимости».**

## Важное

7. **Turbopack + standalone — артефакт проверить заранее** (code #3, risks #8). Подтверждено по исходнику Next 15.5.15: `writeStandaloneDirectory` вызывается после обеих compile-веток → standalone создаётся при `--turbopack`. Но если артефакт неполный/отсутствует — runner стартует без `server.js`. → **Шаг 1: добавить в Dockerfile guard `RUN test -f .next/standalone/server.js` ПЕРЕД runner-COPY (падать на build, не в рантайме).**

8. **`docker build` должен проходить без DATABASE_URL** (code #5). `client.ts` throw'ит на верхнем уровне при отсутствии url; build не должен его импортировать (force-dynamic). → **Шаг 1: критерий — `docker build` без DATABASE_URL в окружении проходит.**

9. **POSTGRES_PASSWORD дублируется в DATABASE_URL** (risks #9). Рассинхрон пароля → web не подключится к БД (500). → **Шаг 4: явно предупредить + добавить проверку соответствия (или скрипт сборки DATABASE_URL из частей). Минимум — критерий «пароль в DATABASE_URL == POSTGRES_PASSWORD».**

10. **backup.sh: имя volume хрупко** (code #6, risks #6, structure #8). `tanar-site_product-images` зависит от имени папки клона; несуществующий volume Docker молча создаёт пустым → пустой бэкап фото. → **Шаг 4/7: задать `COMPOSE_PROJECT_NAME=tanar-site` в .env → имя volume детерминировано. Шаг 8 использует его.**

11. **push-media механизм не зафиксирован** (risks #7, structure #3). Формат манифеста, передача на VPS, сервис в compose — открыты, несколько противоречивых «зафиксировано». → **Шаг 9: один путь — сервис `push-media` (profile tools, в compose из шага 2), читает манифест-JSON (формат описать), файлы доставляются `docker cp`/rsync. Убрать альтернативы.**

12. **urlForWidth уже дублирована (2 места)** (code #2). Шаг 9 говорит «вынести в общую функцию», но дублей уже два, CLI рискует стать третьим. → **Шаг 9: при выносе общей функции учесть оба существующих дубля (store.ts + client.ts), не плодить третий.**

13. **web стартует до миграций** (structure #7). Шаг 7г: `up --build` до `migrate` → web логирует ошибки БД. → **Шаг 7: примечание «ошибки web до migrate ожидаемы; после migrate — `docker compose restart web`». Либо не стартовать web до миграций.**

## Мелочи

- **backups/ не создаётся** (risks #10) → `mkdir -p backups` в шаг 7/8.
- **ufw 22 без проверки реального SSH-порта** (risks #11) → шаг 7а: проверить порт SSH перед `ufw enable` (PS.kz может менять). Иначе блокировка сессии.
- **content/blog в standalone** (risks T2) → проверить, что `content/` скопирован в runner (иначе /blog упадёт). Уточнить в шаге 1.
- **Caddy staging CA при отладке** (risks #4, T1) → чтобы не словить LE rate-limit: тестовый прогон через staging-issuer Caddy. Примечание в шаг 3/7.
- **`.kz` DNS TTL до 24ч** (risks #4) → шаг 7: предупредить, что распространение может быть часами, не минутами.
- **COPY --chown vs chown -R** (structure #9) — `COPY --chown=node:node` чище (меньше слой). Косметика.

## Противоречия между ревьюерами
Нет. Находки взаимодополняющие (code подтвердил Turbopack+standalone работает по исходнику; risks/structure сошлись на одних и тех же дырах: compose-сервисы, merge, volume-права, drizzle-env).

## Рекомендации (по приоритету)
1. **Шаг 2 — сделать «домом» всех tools-сервисов** (migrate/seed/push-media под profile tools) + env для caddy (DOMAIN) + COMPOSE_PROJECT_NAME. Закрывает критичное #2, #3, важное #10, #11.
2. **Шаг 6 — предохранитель сида**: count==0 проверка в seed.ts + флаг inline, не в .env. Закрывает критичное #1.
3. **Шаг 5 — закрыть drizzle-env вопрос фактом** (проверить локально, при необходимости поправить config). Критичное #4.
4. **Шаг 7 — merge dev→main первым предусловием** с проверкой; примечание про web до migrate, SSH-порт, DNS TTL. Критичное #5.
5. **Шаг 1 — volume-права (один механизм) + guard на standalone-артефакт + build без DATABASE_URL + content/**. Критичное #6, важное #7, #8.
6. **Шаг 9 — один путь push-media**, учесть существующие дубли urlForWidth. Важное #11, #12.
7. Мелочи — по ходу (mkdir backups, ufw-порт, Caddy staging).
