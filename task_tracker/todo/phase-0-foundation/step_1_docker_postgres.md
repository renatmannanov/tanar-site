# Шаг 1: Docker + Postgres (dev + test)

> Зависит от: нет
> Статус: [ ] pending

## Задача

Создать `docker-compose.yml` в корне проекта с двумя сервисами Postgres: dev (5432) и test (5433). Документировать запуск в README/CLAUDE.md (CLAUDE.md обновляется в отдельном шаге 9, пока — заметка в `docs/db-setup.md` либо просто полагаемся на step 9).

### `docker-compose.yml` в корне

Версия не указывать (compose v2 не требует поле `version`).

Два сервиса:
- `postgres-dev`: image `postgres:16-alpine`, порт `5432:5432`, БД `tanar_dev`, user `tanar`, пароль `tanar_dev_pw` (НЕ секрет, локальная dev-БД), volume `postgres-dev-data:/var/lib/postgresql/data`.
- `postgres-test`: image `postgres:16-alpine`, порт `5433:5432`, БД `tanar_test`, user `tanar`, пароль `tanar_test_pw`, volume `postgres-test-data:/var/lib/postgresql/data`.

Оба сервиса: `restart: unless-stopped`, healthcheck через `pg_isready`.

Named volumes объявить внизу:
```yaml
volumes:
  postgres-dev-data:
  postgres-test-data:
```

### `.gitignore`

Убедиться что `.env.local`, `.env*.local` в `.gitignore`. Если нет — добавить.

### `package.json` scripts

Добавить:
```json
"db:up": "docker compose up -d",
"db:down": "docker compose down",
"db:logs": "docker compose logs -f"
```

### Документация (мини)

Не делать отдельный `docs/db-setup.md` — комментарии в `docker-compose.yml` и обновление CLAUDE.md в шаге 9 покрывают вопрос.

## Тесты

- Существующие e2e не затрагиваются.
- Smoke: `npm run db:up` → оба контейнера в `running (healthy)` → `psql` пингует обе БД.

## Команды для верификации (PowerShell)

```powershell
npm run db:up
docker compose ps                                    # оба сервиса healthy
# проверка подключения через docker exec (psql внутри контейнера):
docker exec -i tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT 1"
docker exec -i tanar-site-postgres-test-1 psql -U tanar -d tanar_test -c "SELECT 1"
npm run db:down                                       # должно корректно остановиться
```

(Имена контейнеров зависят от имени папки проекта. Если другие — найти через `docker compose ps` и подставить.)

## Критерии готовности

- [ ] `docker-compose.yml` создан в корне с двумя сервисами Postgres 16
- [ ] `npm run db:up` поднимает оба сервиса, оба показывают `(healthy)` в `docker compose ps`
- [ ] `psql ... -c "SELECT 1"` возвращает `1` для обоих БД
- [ ] `npm run db:down` корректно останавливает
- [ ] `.gitignore` содержит `.env.local`
- [ ] `package.json` имеет `db:up`/`db:down`/`db:logs`
- [ ] Коммит: `chore(db): add docker-compose with dev and test postgres`
