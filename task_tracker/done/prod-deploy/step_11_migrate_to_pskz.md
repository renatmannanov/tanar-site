# Шаг 11: Переезд Hetzner → PS.kz (боевой сервер)

> Зависит от: шаг 7 (демо работает на Hetzner), шаг 8 (бэкап — это ИНСТРУМЕНТ переезда).
> Статус: [x] DONE (2026-06-09)
> Выполнено: https://tanar.kz живой на PS.kz (89.219.32.75).

## Как фактически прошло (отклонения от плана ниже)

Переезд выполнен **2026-06-09**, но порядок отличался от изначального runbook —
заказчица купила боевой сервер PS.kz (тариф Basic-2, Ubuntu 24.04, 2 vCPU /
1.9 ГБ RAM / 40 ГБ SSD) и сразу настроила DNS, поэтому:

1. **DNS переключили РАНЬШЕ деплоя** (не в конце, как в 11е). `tanar.kz` +
   `www` (CNAME) → 89.219.32.75 через PS.kz nameservers (ns1/ns2/ns3.ps.kz).
   Делегирование `.kz` прошло быстрее заявленных 4-24ч.
2. **Данные НЕ переносили бэкапом** (вопреки 11в-11г): на Hetzner были только
   демо-данные (исходный сид 12/30/109 + 4 тестовых фото). Решение владельца —
   **чистый деплой + сид** на PS.kz, фото заказчица зальёт через админку.
   Поэтому restore (деструктивный шаг) не выполнялся вообще.
3. **Прогрев «до переключения» (11д) не делали** — DNS уже был переключён;
   проверяли сразу боевой `https://tanar.kz`.

## Что сделано на PS.kz (по факту)

- **Сервер захардненен:** docker + compose (v29.5.3 / v5.1.4), swap 2 ГБ
  (RAM всего 1.9 ГБ — без swap билд/photogen уходят в OOM), UFW (22/80/443),
  **SSH key-only** (парольный вход отключён: cloud-init `50-cloud-init.conf`
  ставил `PasswordAuthentication yes` и перебивал наш `99-` — обезврежен sed'ом;
  ключ `~/.ssh/tanar_vps`, в SSH-config как `tanar-vps`).
- **Код:** `git clone` main, `.env` собран (новые БД-пароль + session secret,
  ADMIN_PASSWORD и GEMINI_API_KEY перенесены с Hetzner сервер→сервер, DOMAIN=tanar.kz).
- **Стек:** `up --build --no-cache` → web+postgres+caddy; `migrate`; `seed`
  inline `ALLOW_PROD_SEED=1` (12/30/109 + site_settings + 8 faq — seed.ts сам
  сидит site-content, отдельный seed-site не понадобился).
- **SSL:** Caddy выпустил LE-сертификаты на `tanar.kz` И `www.tanar.kz`.
  Добавлен www→apex 301-редирект в Caddyfile (коммит на dev+main, файл
  скопирован на сервер + `restart caddy`).

## Хвосты (НЕ входят в закрытие плана)

- **Hetzner держим как откат 1-2 дня** (11ж) → напоминание-проверка на
  2026-06-11 через /schedule (routine trig_01TxfMbNEcRDRWqcmb57jJqz):
  проверит tanar.kz и даст зелёный свет гасить Hetzner вручную.
- **Перенести cron бэкапа** (шаг 8) на PS.kz — после гашения Hetzner.
- TTL-манёвр (11.0) не делали — переключение DNS уже позади.

---

## (Исходный runbook — оставлен для истории)

## Задача

Перенести работающий сервис с демо-VPS (Hetzner) на боевой PS.kz (Ubuntu, локально в КЗ) без потери данных и фото. Код НЕ меняется — это чисто инфраструктурная операция: бэкап на старом → restore на новом → переключить DNS.

> **ДЕСТРУКТИВНЫХ операций с потерей данных НЕТ**, если соблюдать порядок (прогрев нового до переключения, старый не гасить сразу). Но restore на PS.kz перезаписывает там БД — выполнять на ЧИСТОМ PS.kz, под подтверждение пользователя.

## Предусловия (согласовать с заказчицей)
- Доступ к PS.kz-серверу (SSH), оплачен.
- **«Тихое окно» ~15 мин:** заказчица не вносит изменения в админку во время переноса (иначе правки между бэкапом и переключением DNS потеряются).
- Решено, какой домен боевой (основной `.kz` → PS.kz IP).

## Порядок (НЕ нарушать — прогрев до переключения)

### 11.0. Заранее (за сутки до переезда): снизить DNS TTL
В панели регистратора `.kz` для основного домена снизить TTL A-записи до 300 сек (5 мин). Это ускорит переключение IP в день переезда (иначе старый IP может кешироваться часами). Вернуть TTL обратно после переезда.

### 11а. Подготовить PS.kz-сервер
Повтор шага 7а на новом сервере: docker + compose, ufw (реальный SSH-порт + 80/443). См. step_7 раздел 7а.

### 11б. Развернуть код на PS.kz (БЕЗ сида!)
```bash
git clone https://github.com/renatmannanov/tanar-site.git
cd tanar-site
git checkout main
mkdir -p backups
cp .env.prod.example .env
nano .env   # боевые значения: пароли, DOMAIN=<основной .kz>, COMPOSE_PROJECT_NAME=tanar-site, секрет ≥32
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate   # ТОЛЬКО схема, БЕЗ seed
docker compose -f docker-compose.prod.yml restart web
```
> **НЕ запускать сид!** Каталог приедет из бэкапа Hetzner (с актуальными правками + фото-привязками), а не из снапшота. Сид перезаписал бы реальные данные снапшотом. Предохранитель шага 6 (count>0) тоже откажет — но просто НЕ запускать.

### 11в. Снять согласованный бэкап на Hetzner (в тихое окно)
На Hetzner-сервере:
```bash
./scripts/backup.sh   # db-<TS>.sql.gz + images-<TS>.tar.gz с одной меткой
```
Перенести ПАРУ файлов на PS.kz (одна метка TS!):
```bash
scp backups/db-<TS>.sql.gz backups/images-<TS>.tar.gz user@<pskz-ip>:~/tanar-site/backups/
```

### 11г. Restore на PS.kz (под подтверждение)
По документированной процедуре шага 8 (restore), пара с ОДНОЙ меткой TS:
```bash
# БД (перезаписывает схему из 11б данными Hetzner):
gunzip -c backups/db-<TS>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
# Фото в volume product-images:
docker run --rm -v tanar-site_product-images:/data -v $PWD/backups:/backup alpine \
  sh -c "cd /data && tar xzf /backup/images-<TS>.tar.gz"
docker compose -f docker-compose.prod.yml restart web
```

### 11д. Прогрев — проверить PS.kz ДО переключения DNS
Пока домен ещё указывает на Hetzner, проверить PS.kz по его IP (через `/etc/hosts`-override или временный поддомен):
- витрина отдаёт каталог с фото (не градиенты — значит media_assets + файлы восстановились согласованно);
- `/admin/login` пускает;
- кол-во товаров и фото совпадает с Hetzner: `SELECT count(*) FROM products; SELECT count(*) FROM media_assets;` на обоих — равны.

### 11е. Переключить DNS
Только после успешного прогрева: A-запись основного домена → IP PS.kz. Дождаться распространения (TTL снижен в 11.0). Caddy на PS.kz выпустит боевой сертификат при первом https-запросе.

### 11ж. После переключения
- Проверить `https://<домен>/` → PS.kz, валидный сертификат, фото на месте.
- **Hetzner НЕ гасить сразу** — подержать 1–2 дня как откат, пока PS.kz стабилен.
- Вернуть DNS TTL на обычное значение (11.0).
- Перенести cron бэкапа (шаг 8) на PS.kz.
- Убедиться, что заказчица работает с PS.kz-версией; погасить Hetzner.

## Тесты
- Прогрев (11д): кол-во products и media_assets на PS.kz == Hetzner; витрина с фото.
- После переключения: `https://<домен>` обслуживается PS.kz (проверить IP в `dig`/сертификате).
- Загрузка нового фото через админку на PS.kz проходит (volume-права entrypoint работают и здесь).

## Команды для верификации
```bash
# Сверка данных (на обоих серверах должно совпасть):
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM products; SELECT count(*) FROM media_assets;"
# После переключения DNS:
dig +short <домен>          # IP PS.kz
curl -I https://<домен>/    # 200, сертификат на основной домен
```

## Критерии готовности
- [ ] DNS TTL снижен заранее (11.0)
- [ ] PS.kz подготовлен (docker, ufw на реальный SSH-порт), код развёрнут, схема мигрирована (БЕЗ сида)
- [ ] Согласованный бэкап Hetzner (одна метка) перенесён и восстановлен на PS.kz
- [ ] Прогрев: products и media_assets на PS.kz == Hetzner; витрина с фото ДО переключения DNS
- [ ] DNS переключён на PS.kz; боевой сертификат выпущен; фото на месте
- [ ] Hetzner подержан как откат, затем погашен; cron бэкапа перенесён; TTL возвращён
- [ ] Деструктивный restore выполнен под подтверждением пользователя
- [ ] Коммит (если были правки доков): `docs(deploy): Hetzner→PS.kz migration runbook`
