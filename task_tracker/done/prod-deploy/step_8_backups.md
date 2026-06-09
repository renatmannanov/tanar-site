# Шаг 8: Согласованный бэкап (БД + фото)

> Зависит от: шаг 7 (прод работает).
> Статус: [ ] pending

## Задача

Бэкап ДОЛЖЕН быть согласованным: дамп Postgres И архив папки фото снимаются в ОДНОЙ точке времени. Иначе `media_assets` и файлы рассинхронятся (строка есть — файла нет, или наоборот → градиент-фолбэк/битая картинка).

### `scripts/backup.sh` (новый; запускается на VPS)
Логика:
0. `mkdir -p backups` в начале скрипта (ФИКС ревью — не падать, если директории нет).
1. Метка времени `TS=$(date +%Y%m%d-%H%M%S)`.
2. Дамп БД: `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backups/db-$TS.sql.gz`.
3. Архив фото из volume: имя volume — **детерминировано `tanar-site_product-images`** благодаря `COMPOSE_PROJECT_NAME=tanar-site` в `.env` (шаг 4). НЕ полагаться на имя папки. ФИКС ревью: перед tar проверить, что volume существует (`docker volume inspect tanar-site_product-images` — иначе `docker run -v` молча создаст ПУСТОЙ volume → пустой бэкап):
   ```sh
   VOL=tanar-site_product-images
   docker volume inspect "$VOL" >/dev/null || { echo "volume $VOL missing — aborting"; exit 1; }
   docker run --rm -v "$VOL":/data:ro -v "$PWD/backups":/backup alpine tar czf "/backup/images-$TS.tar.gz" -C /data .
   ```
4. Ротация: удалять бэкапы старше N дней (напр. 14).
- Пара файлов `db-$TS` + `images-$TS` с одной меткой = согласованный снимок.

> **Замечание по согласованности:** идеально — снимать оба под краткой паузой записи. Но трафик низкий (один админ), вероятность записи фото ровно между двумя шагами мала. Зафиксировано: для текущего масштаба достаточно снять подряд db→images; если позже потребуется строгая согласованность — останавливать web на секунды бэкапа. Не усложнять сейчас.

### cron
```bash
crontab -e
# Каждую ночь в 3:30:
30 3 * * * cd /home/$USER/tanar-site && ./scripts/backup.sh >> backups/backup.log 2>&1
```

### Документировать восстановление (в скрипте/README рядом)
> **ДЕСТРУКТИВНО — restore под подтверждение пользователя.**
1. Восстановить БД: `gunzip -c backups/db-TS.sql.gz | docker compose ... exec -T postgres psql -U $USER -d $DB`.
2. Восстановить фото: распаковать `images-TS.tar.gz` в volume `product-images`.
3. Брать db и images с ОДНОЙ меткой TS.

## Тесты
- Прогнать `backup.sh` вручную → появились `db-TS.sql.gz` + `images-TS.tar.gz`.
- **Тест-восстановление на чистом окружении** (отдельный compose / тест-VPS): restore из пары → каталог и фото на месте, витрина показывает фото (не градиенты).
- Ротация удаляет старое (сэмулировать старой меткой).

## Команды для верификации
```bash
./scripts/backup.sh
ls -la backups/    # db-*.sql.gz и images-*.tar.gz с одной меткой
# Тест-restore (на тестовом стеке, НЕ на проде поверх живого):
# ... restore по документированной процедуре → витрина с фото.
```

## Критерии готовности
- [ ] `scripts/backup.sh`: dump БД + tar фото с единой меткой времени, ротация старых
- [ ] cron настроен, отработал хотя бы раз (есть свежая пара в backups/)
- [ ] Документирована процедура restore (под подтверждение)
- [ ] Тест-восстановление на чистом окружении даёт рабочий каталог + фото
- [ ] Коммит: `chore(deploy): consistent backup script (db + images) + cron`
