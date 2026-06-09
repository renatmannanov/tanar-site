# Шаг 7: Первый деплой end-to-end (VPS + DNS)

> Зависит от: шаги 1–6 (все артефакты собраны и проверены локально).
> Статус: [ ] pending

## Задача

Развернуть стек на реальном VPS, привязать домен `.kz`, получить https, проверить витрину+админку. Шаги — конкретные команды под копипаст по SSH (админит пользователь с ИИ).

> **Предусловие:** существующий **VPS Hetzner** (демо/тест для клиента), Ubuntu 22.04+, доступ по SSH; домен для демо (поддомен или временный). Боевой переезд на PS.kz — шаг 11 после демо.
> **Домен для демо:** можно использовать поддомен (напр. `demo.tanar.kz` или любой доступный) — Caddy выпустит сертификат на него так же. На боевом PS.kz (шаг 11) переключим на основной домен.

### 7.0. ПЕРВОЕ предусловие — merge dev→main (ФИКС ревью, до всего остального)
Сейчас весь прогресс (Фаза 1.5 + этот план) на `dev`, в `main` НЕ влито. Шаг 7в клонирует `main` — если не влить, развернётся устаревший код (build пройдёт без ошибки, проблема всплывёт только функционально). **Влить ОСОЗНАННО по git-протоколу `~/.claude/CLAUDE.md` (под подтверждение пользователя), ДО клонирования на VPS.** Проверка перед деплоем:
```bash
git log main --oneline -5   # должны быть коммиты Фазы 1.5 (storefront-completion) и prod-deploy
```
Если их нет — СТОП, сначала merge.

### 7а. Подготовка VPS
```bash
# Обновить, поставить docker + compose plugin:
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # перелогиниться после
# ФИКС ревью: УЗНАТЬ реальный SSH-порт ПЕРЕД ufw (PS.kz может не использовать 22 — иначе ufw enable
# заблокирует текущую сессию, останется только KVM-консоль провайдера):
sudo ss -tlnp | grep sshd       # увидеть фактический порт sshd (обычно 22)
SSH_PORT=22                     # заменить на реальный, если отличается
sudo ufw allow ${SSH_PORT} && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

### 7б. DNS ПЕРЕД деплоем (критично для SSL)
- В панели регистратора `.kz`: A-запись `@` (и `www`, если нужен) → IP VPS.
- **`.kz` TTL может быть до 24ч** (ФИКС ревью) — распространение бывает не минуты, а часы. Дождаться, пока `dig +short tanar.kz` С VPS показывает его IP, и проверить с ВНЕШНЕЙ сети тоже (LE резолвит снаружи).
- **Caddy выпустит сертификат только когда DNS уже указывает на VPS и порты 80/443 открыты.** Порядок: DNS распространился → код на сервере → `up` → первый https-запрос триггерит ACME. На время отладки — staging-issuer (шаг 3), чтобы не сжечь LE-лимит.

### 7в. Код и env на сервере
```bash
git clone https://github.com/renatmannanov/tanar-site.git
cd tanar-site
git checkout main            # main УЖЕ содержит всё (проверено в 7.0)
mkdir -p backups             # ФИКС ревью: директория для бэкапов (шаг 8 cron туда пишет)
cp .env.prod.example .env
nano .env                    # реальные значения: пароли (POSTGRES_PASSWORD == пароль в DATABASE_URL!),
                             # DOMAIN, ADMIN_SESSION_SECRET ≥32, COMPOSE_PROJECT_NAME=tanar-site
```

### 7г. Сборка → миграции → старт web → сид (ПОРЯДОК важен, ФИКС ревью)
```bash
# 1. Поднять postgres+caddy+web. web может логировать ошибки БД до миграций — ЭТО ОЖИДАЕМО:
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
# 2. Применить миграции (создать таблицы):
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
# 3. Перезапустить web, чтобы он стартовал уже с готовой схемой (убрать стартовые ошибки БД):
docker compose -f docker-compose.prod.yml restart web
# 4. СИД — деструктивно, под подтверждение (см. шаг 6). Флаг inline. Предохранитель откажет, если каталог не пуст:
docker compose -f docker-compose.prod.yml --profile tools run --rm -e ALLOW_PROD_SEED=1 seed
# 5. Наблюдать выпуск сертификата:
docker compose -f docker-compose.prod.yml logs -f caddy
```

### 7д. Проверка (с любой машины)
- `https://tanar.kz/` → главная, валидный сертификат (замок).
- `http://tanar.kz/` → редирект на https.
- `https://tanar.kz/catalog` → 12 карточек (градиенты).
- `https://tanar.kz/catalog/jacket-sv7-goretex` → 200, бейдж/размеры/уход.
- `https://tanar.kz/admin/login` → форма; вход паролем → `/admin/catalog`.
- В админке создать тест-товар как draft → `https://tanar.kz/catalog/<slug>` = 404; в админке виден. Перевести в published → появляется. (Проверка статус-видимости на проде.)
- **Загрузка фото**: в админке загрузить ≥3 МБ JPG → проходит (sharp работает на slim, Caddy не режет тело). Фото видно на витрине. Удалить тест-товар.

## Тесты
- Все проверки 7д — ручные, по чеклисту.
- Персистентность: `docker compose ... restart` / пересоздание web-контейнера → фото и каталог на месте (volume).

## Команды для верификации
```bash
# На VPS:
docker compose -f docker-compose.prod.yml ps          # все running/healthy
curl -I https://tanar.kz/                             # 200, https
curl -I http://tanar.kz/                              # 308 redirect → https
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM products;"  # 12
```

## Критерии готовности
- [ ] **merge dev→main выполнен ПЕРВЫМ** (7.0), `git log main` показывает коммиты Фазы 1.5 + prod-deploy
- [ ] VPS подготовлен (docker, ufw на РЕАЛЬНЫЙ SSH-порт + 80/443; сессия не потеряна)
- [ ] DNS `.kz` → IP VPS (dig изнутри И снаружи) ДО первого https-запроса
- [ ] `backups/` создана; стек поднят; миграции применены; web перезапущен; каталог засеян (12, предохранитель отработал)
- [ ] `https://<домен>/` отдаёт витрину с валидным сертификатом; http→https редирект
- [ ] `/catalog`, `/catalog/[slug]`, `/admin/login`, `/blog` работают на проде
- [ ] draft/archived скрыты (404) на проде; published виден; в админке всё видно
- [ ] Загрузка фото через админку прода проходит (sharp на slim + entrypoint chown + Caddy ≥10mb)
- [ ] Перезапуск контейнеров не теряет данные (volumes)
- [ ] Коммит (если были правки compose/доков по итогам деплоя): `docs(deploy): first-deploy runbook + fixes`
