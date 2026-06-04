# Шаг 11: Переезд Hetzner → PS.kz (боевой сервер)

> Зависит от: шаг 7 (демо работает на Hetzner), шаг 8 (бэкап — это ИНСТРУМЕНТ переезда).
> Статус: [ ] pending
> Выполняется: ПОСЛЕ демо клиенту и согласования боевого сервера с заказчицей.

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
