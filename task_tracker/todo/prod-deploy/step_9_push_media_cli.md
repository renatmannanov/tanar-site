# Шаг 9: CLI массовой заливки фото на прод

> Зависит от: шаг 7 (прод работает), шаг 8 (бэкап — желателен перед массовой записью).
> Статус: [ ] pending

## Задача

Кейс пользователя: фото генерятся/обрабатываются ЛОКАЛЬНО, потом заливаются ПАЧКОЙ на прод. Нужен CLI: положить webp-файлы в volume `product-images` на проде И вставить строки `media_assets` в прод-БД, идемпотентно.

### Формат media_assets (факт из кода — НЕ менять конвенцию)
- Имена файлов: `<uuid>-<width>.webp`, width ∈ {1600, 800, 400}. Все три ширины на диск.
- Папка: `public/images/products/<slug>/`.
- Строка `media_assets`: ОДНА на фото, `url='/images/products/<slug>/<uuid>-1600.webp'` (только 1600 в url; остальные выводятся `urlForWidth`), `scope='product'`, `role='lifestyle'`, `productId`+`variantId` (резолв по slug→colorId), `sortOrder = max(existing для variantId)+1`, `alt` (по умолчанию `Фото N`).
- Это РОВНО то, что делает `mediaStore.upload` — но из готовых файлов.

### Архитектура (ЗАФИКСИРОВАНА — один путь, три части)
БД наружу не опубликована (шаг 2) → вставку в БД делаем ИЗ контейнера на проде, как сид. Поток:
1. **`scripts/push-media.ts --prepare` (локально):** читает манифест-вход + исходники → генерит 3×webp (общий uuid) → раскладывает в `./push-out/<slug>/` → пишет `./push-out/manifest.json` (что куда вставлять).
2. **Доставка (локально → VPS):** `docker cp ./push-out/<slug>/. <web-container>:/app/public/images/products/<slug>/` для файлов; манифест — `docker cp ./push-out/manifest.json <web-container>:/app/push-out/manifest.json` (или в общий bind). Конкретные команды — в README шага.
3. **`scripts/apply-media-manifest.ts` (на проде, сервис `push-media` из шага 2):** читает манифест из контейнера, резолвит productId/variantId по slug+colorId, bulk-insert в БД. Запуск: `docker compose --profile tools run --rm push-media`.

### Форматы (зафиксированы)
- **Манифест-ВХОД** (даёт пользователь, локально): `[{ "slug": "...", "colorId": "...", "files": ["path1.jpg", ...] }]`.
- **Манифест-ВЫХОД** (`push-out/manifest.json`, генерит prepare): `[{ "slug", "colorId", "assets": [{ "uuid", "url1600", "alt"? }] }]`.

### Общая функция генерации ширин (ФИКС ревью — не плодить дубли)
Генерацию 3×webp вынести в общую утилиту, которую используют И `store.ts` (upload), И CLI prepare. **Учесть существующие дубли:** `urlForWidth` уже определена в `store.ts` И продублирована в `media/client.ts` (2 места). При выносе — общий источник для всех трёх потребителей (store, client, CLI), не добавлять четвёртый. Минимально: вынести в `@/core/media` shared-модуль `widths.ts` (имена файлов, `urlForWidth`, sharp-pipeline без записи в БД).

### Идемпотентность и безопасность
- `apply-media-manifest`: перед вставкой — проверка по `url` (uuid уникален → новые файлы не дублируются; повторный прогон ТОГО ЖЕ манифеста — строки с такими url уже есть → пропуск).
- **Правило `~/.claude`:** массовая вставка >10 строк — вывести план (сколько фото, в какие товары) и запросить подтверждение ДО записи.

## Тесты
- Локально (прод-стек с тест-БД): прогнать push-media для 1 товара/цвета с 2 фото → файлы в volume, 2 строки media_assets, витрина показывает фото (не градиент).
- Идемпотентность: повторный прогон тех же файлов → 0 новых строк.
- >10 строк → подтверждение запрашивается.

## Команды для верификации
```powershell
# 1. Локально: webp + манифест-выход из манифеста-входа:
npx tsx scripts/push-media.ts --prepare ./push-in.json --out ./push-out
# 2. Доставка на прод (пример):
docker cp ./push-out/<slug>/. <web-container>:/app/public/images/products/<slug>/
docker cp ./push-out/manifest.json <web-container>:/app/push-out/manifest.json
# 3. Применить на проде (сервис push-media из шага 2):
docker compose -f docker-compose.prod.yml --profile tools run --rm push-media
# Проверить:
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM media_assets;"
```

## Критерии готовности
- [ ] Генерация 3 ширин webp + `urlForWidth` вынесены в ОДИН shared-модуль (`@/core/media/widths`); store.ts и client.ts переведены на него (дубль устранён, не добавлен третий)
- [ ] `scripts/push-media.ts --prepare`: webp + manifest.json (форматы вход/выход — как зафиксировано)
- [ ] `scripts/apply-media-manifest.ts` (сервис `push-media` из шага 2): резолв productId/variantId по slug+colorId, bulk-insert
- [ ] Идемпотентность: повторный прогон того же манифеста — 0 новых строк (проверка по url)
- [ ] Массовая вставка >10 строк — под подтверждение
- [ ] Фото видны на витрине прода после прогона
- [ ] Коммит: `feat(tools): bulk push-media CLI for prod photo upload`
