# Аналитика посещаемости (Umami)

> Тип: инфраструктура / аналитика
> Статус: backlog
> Заявлено: 2026-06-10

## Контекст

Сайт боевой (https://tanar.kz), но нет аналитики — не видно трафика, источников, популярных
товаров, конверсии. Нужна приватная (без кук, GDPR-friendly) веб-аналитика. Выбран **Umami**:
self-hosted, лёгкий, ставится рядом на тот же VPS, не требует cookie-баннера.

## Варианты размещения

- **A. Self-hosted на том же VPS (PS.kz, 89.219.32.75)** — контейнер `umami` + его Postgres
  в `docker-compose.prod.yml`, поддомен `analytics.tanar.kz` через Caddy. Полный контроль, бесплатно,
  но +2 контейнера и ресурсы.
- **B. Umami Cloud** — бесплатный тариф, ноль хостинга, только вставить скрипт. Проще, но данные
  у вендора и лимит на события.

Рекомендация: начать с **A** (инфра под Docker уже стоит, поддомены через Caddy уже умеем —
см. www-redirect), либо **B** если не хочется грузить VPS.

## Что сделать (вариант A, self-hosted)

### 1. Docker-сервисы
- В `docker-compose.prod.yml` добавить `umami` (`ghcr.io/umami-software/umami:postgresql-latest`)
  + отдельный `umami-db` (postgres). НЕ переиспользовать боевую БД сайта — отдельный том/БД.
- Секреты в `.env` на сервере (права 600): `UMAMI_APP_SECRET` (рандом ≥32), пароль umami-db.
- Healthcheck + `restart: unless-stopped`.

### 2. Caddy
- Блок `analytics.tanar.kz { reverse_proxy umami:3000 }` — авто-SSL Let's Encrypt.
- Предусловие: DNS-запись `analytics.tanar.kz` → IP VPS (A-record на PS.kz).

### 3. Настройка Umami
- Первый вход (дефолт admin/umami → **сразу сменить пароль**), завести website для tanar.kz,
  получить `website-id` и URL скрипта.

### 4. Трекинг-скрипт на сайте
- Вставить `<Script>` (next/script, strategy="afterInteractive") в `src/app/(public)/layout.tsx`
  с `data-website-id` и `src` на свой Umami. **Только на публичной витрине**, не в `/admin`.
- Env-gate: подключать скрипт только в проде (`process.env.NODE_ENV === 'production'` или
  отдельный `NEXT_PUBLIC_UMAMI_*`), чтобы dev/e2e не слали события.

### 5. Проверка
- `npm run build` / typecheck чистые, e2e не сломались (скрипт не грузится при `PHOTOGEN_FAKE`/dev).
- На проде: открыть сайт → в Umami появился реалтайм-визит.
- `/admin` НЕ трекается.

## Подводные камни

- e2e (Playwright) не должны ловить внешний скрипт — гейтить по env.
- Не класть `UMAMI_APP_SECRET` и пароли в git — только в серверный `.env` (как остальные секреты).
- Umami-БД бэкапить отдельно (или сознательно решить, что аналитику не бэкапим).
- Если выбран вариант B (Cloud) — шаги 1–3 отпадают, остаётся только шаг 4 (вставить скрипт).

## Приоритет

Средний. Желательно поднять до активного продвижения, чтобы с первого трафика были данные.
Не блокер для функциональности сайта.

## Связанные

- [social-link-previews-og.md](./social-link-previews-og.md) — OG-превью (та же «маркетинг-готовность»)
- CLAUDE.md, секция «Прод-деплой» — docker-compose.prod.yml, Caddy, поддомены, секреты в .env
- [go-live-checklist.md](./go-live-checklist.md) — общий чеклист запуска
