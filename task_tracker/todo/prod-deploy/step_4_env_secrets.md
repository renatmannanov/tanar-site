# Шаг 4: Прод-env и секреты

> Зависит от: нет (но используется шагами 2/5/6/7).
> Статус: [ ] pending

## Задача

Шаблон прод-окружения + документированная генерация секретов. Значения НЕ коммитим.

### `.env.prod.example` (новый, в корне; коммитим ШАБЛОН без значений)
```
# --- Имя docker-проекта (детерминирует имена volume; backup.sh опирается на это) ---
COMPOSE_PROJECT_NAME=tanar-site

# --- Postgres (внутренний контейнер) ---
POSTGRES_USER=tanar
POSTGRES_PASSWORD=__CHANGE_ME__strong_db_password__
POSTGRES_DB=tanar_prod

# --- Подключение web к БД (имя сервиса postgres, внутренний порт 5432) ---
# ВНИМАНИЕ: пароль здесь ДОЛЖЕН совпадать с POSTGRES_PASSWORD выше (см. предупреждение).
DATABASE_URL=postgres://tanar:__CHANGE_ME__strong_db_password__@postgres:5432/tanar_prod

# --- Admin auth ---
# ADMIN_SESSION_SECRET ≥32 символа. Генерация:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
ADMIN_PASSWORD=__CHANGE_ME__admin_login_password__
ADMIN_SESSION_SECRET=__CHANGE_ME__random_32_plus_chars__

# --- Домен (для Caddy auto-SSL; передаётся в caddy-контейнер через environment) ---
DOMAIN=tanar.kz
```
- **ФИКС ревью (рассинхрон пароля):** `POSTGRES_PASSWORD` и пароль внутри `DATABASE_URL` — ДВА места одного значения (compose не умеет подставлять env в env). При заполнении `.env` менять ОБА. В шаблоне оба помечены `__CHANGE_ME__strong_db_password__` (одинаковая метка-подсказка). Предупреждение комментарием в файле + критерий проверки ниже.
- `COMPOSE_PROJECT_NAME=tanar-site` — фиксирует имя volume `tanar-site_product-images` (backup.sh шаг 8 опирается на него).
- На проде: скопировать `.env.prod.example` → `.env` (gitignored), заполнить реальными значениями.

### Документация генерации
В шаге описать (и продублировать в CLAUDE.md на завершении):
- `ADMIN_SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `POSTGRES_PASSWORD` / `ADMIN_PASSWORD`: длинные случайные (тот же приём или менеджер паролей).

### Проверка `.gitignore`
`.env*` уже игнорится (кроме `.env.example`). Убедиться, что `.env.prod.example` НЕ игнорится (он шаблон — должен коммититься). Текущее правило: `!.env.example` — НЕ покрывает `.env.prod.example`. **Добавить в `.gitignore` исключение `!.env.prod.example`.**

## Тесты
- `git check-ignore .env` → игнорится (хорошо). `git check-ignore .env.prod.example` → НЕ игнорится (пусто) после правки.

## Команды для верификации
```powershell
git check-ignore .env            # выведет ".env" (игнорится — ок)
git check-ignore .env.prod.example   # пусто = НЕ игнорится (коммитим шаблон — ок)
# Проверить генератор секрета:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url').length)"   # ≥43
```

## Критерии готовности
- [ ] `.env.prod.example` создан (шаблон, без реальных значений), вкл. `COMPOSE_PROJECT_NAME`, `DOMAIN`
- [ ] `.gitignore`: `!.env.prod.example` добавлен; `.env` по-прежнему игнорится
- [ ] Документирована генерация ADMIN_SESSION_SECRET (≥32) и паролей
- [ ] DATABASE_URL указывает на сервис `postgres:5432` (не 5442); пароль в нём == POSTGRES_PASSWORD (предупреждение в файле)
- [ ] Коммит: `chore(deploy): prod env template + secret generation docs`
