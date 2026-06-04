# Шаг 5: Миграции на проде

> Зависит от: шаг 1 (образ), шаг 2 (postgres-сервис), шаг 4 (env).
> Статус: [ ] pending

## Задача

Применить drizzle-миграции к чистой прод-БД. Проблема: `drizzle-kit` и `tsx` — devDependencies, в standalone-рантайме их НЕТ. Нужен путь применить миграции на проде.

### Решение (зафиксировано): сервис `migrate` под profile `tools` (УЖЕ в шаге 2)

Сервис `migrate` определён в `docker-compose.prod.yml` ещё в шаге 2: образ = builder-стадия (`target: builder` — в ней есть drizzle-kit/tsx/исходник/`drizzle.config.ts`), `command: npx drizzle-kit migrate`, env (DATABASE_URL на `postgres:5432`) из `.env`, profile `tools` (не стартует при обычном `up`). **Этот шаг compose НЕ правит** — только запускает миграции:
```
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

> `drizzle.config.ts` грузит `.env.local` через dotenv — на проде его нет. DATABASE_URL подаётся через env сервиса `migrate` (из `.env`). **ФАКТ (проверено 2026-06-01):** `dotenv.config({ path: '.env.local' })` при отсутствии файла возвращает `error: ENOENT`, но переменную `DATABASE_URL` из `process.env` НЕ затирает (нет `override`) → drizzle-kit штатно подхватывает url из окружения. Менять `drizzle.config.ts` НЕ нужно. (Вопрос закрыт, не «ПРОВЕРИТЬ».)

## Тесты
- На чистой прод-БД (или локальной копии прод-конфига) применить миграции → таблицы созданы (`products`, `product_variants`, `skus`, `media_assets`, `orders`, ...).
- Идемпотентность: повторный `migrate` не падает (drizzle отмечает применённые).

## Команды для верификации
```powershell
# Применить миграции (сервис migrate из шага 2, profile tools, env из .env):
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
# Проверить таблицы:
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"
```

## Критерии готовности
- [ ] Сервис `migrate` (profile `tools`, из шага 2) запускается, drizzle-kit видит DATABASE_URL из окружения (факт про dotenv подтверждён выше)
- [ ] На чистой БД миграции создают все таблицы (`\dt` показывает их)
- [ ] Повторный `migrate` идемпотентен (не падает)

> Этот шаг кода НЕ меняет (сервис описан в шаге 2). Отдельного коммита нет — проверка применения миграций фиксируется в рамках шага 7 (деплой). Если по итогам нужны правки compose/доков — коммитятся в своих шагах.
