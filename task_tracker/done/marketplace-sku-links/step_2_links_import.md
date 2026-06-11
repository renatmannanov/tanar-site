# Шаг 2: Снапшот ссылок из CSV + идемпотентный сидер

> Зависит от: шаг 1 (колонка skus.marketplaces)
> Статус: [x] done (build прогнан в шаге 5)

## Задача

`internal/` в gitignore — CSV не попадает в прод-образ. Двухзвенный путь:
extract (локально, разово) → коммитим компактный JSON → сидер (dev и прод).

### 1. `scripts/extract-marketplace-links.ts` (коммитится; запускается локально)

- Читает `internal/content-source/TANAR_links.csv` (путь захардкожен).
- CSV содержит многострочные quoted-поля (описания) — парсить **inline
  quote-aware парсером** (одна функция `parseCsv(text): string[][]` —
  посимвольный проход, состояние inQuotes, `""` → `"`). Библиотеку НЕ ставить.
- Строки данных: первая ячейка — целое число (№), вторая — артикул
  `TANAR-\d+`. Строки-заголовки категорий (🧥…) и подвал (ИТОГО…) отсеиваются
  этим фильтром.
- Из каждой строки берём: артикул Ozon (колонка 2, ключ), ссылку Ozon
  (предпоследняя колонка), ссылку Kaspi (последняя). Валидация: ссылка Ozon
  начинается с `https://ozon.kz/`, Kaspi — с `https://kaspi.kz/`; иначе —
  бросить ошибку с номером строки (молча пропускать нельзя).
- Пишет `src/core/db/marketplace-links.json`:
  ```json
  { "TANAR-001": { "ozon": "https://ozon.kz/product/...", "kaspi": "https://kaspi.kz/shop/p/..." } }
  ```
  (отсортировано по ключу — стабильный diff). В конце печатает счётчик.
- Завершиться ошибкой, если записей не ровно 109 (`EXPECTED_COUNT = 109` —
  константа; при обновлении каталога её правят вместе с CSV).

Запустить, JSON закоммитить. Цен/описаний в JSON нет — только публичные URL.

### 2. `src/core/db/seed-marketplace-links.ts` (сидер, паттерн seed-site)

- Читает `marketplace-links.json` (относительно файла:
  `path.join(__dirname, 'marketplace-links.json')` — работает и локально,
  и в builder-образе).
- Одна транзакция: для каждого артикула
  `UPDATE skus SET marketplaces = $links, updated_at = now() WHERE article = $article`.
  Прямой db-доступ допустим — скрипт живёт в `src/core/db/` (слой сида).
- Идемпотентен: повторный запуск перезаписывает те же значения. БЕЗ
  ALLOW_PROD_SEED — скрипт не трогает ничего, кроме `skus.marketplaces`.
- Отчёт в stdout: `updated N, not found in DB: [артикулы]` (артикул из JSON,
  которого нет в БД — НЕ ошибка, просто перечислить; пригодится при
  расхождении каталога). Exit 0 при любом числе not-found.

### 3. Подключение

- `package.json` → `"db:seed-mp-links": "tsx --env-file=.env.local -r tsconfig-paths/register src/core/db/seed-marketplace-links.ts"`.
- `docker-compose.prod.yml` → сервис `seed-marketplace-links` под profile
  `tools` — копия блока `seed-site` с command
  `["npx", "tsx", "-r", "tsconfig-paths/register", "src/core/db/seed-marketplace-links.ts"]`.

## Тесты

e2e не нужны (нет UI). Верификация — SQL после прогона на dev.

> **⚠ Порядок:** SQL-проверки выполнять СРАЗУ после сидера, ДО любых e2e —
> admin.spec/admin-marketplaces.spec в afterAll гоняют `npm run db:seed`,
> который перезаливает skus (marketplaces → `{}`). Нулевой результат SQL после
> полного e2e-прогона — НЕ баг сидера; просто перезапустить `db:seed-mp-links`.

## Команды для верификации

```bash
npx tsx scripts/extract-marketplace-links.ts          # печатает 109, пишет JSON
npm run db:seed-mp-links                              # updated 109, not found: []
npm run db:seed-mp-links                              # повторно — тот же результат
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c \
  "SELECT count(*) FROM skus WHERE marketplaces ? 'ozon' AND marketplaces ? 'kaspi';"   # 109
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c \
  "SELECT marketplaces FROM skus WHERE article='TANAR-001';"  # обе ссылки, ozon содержит 4373879096
npm run typecheck && npm run lint && npm run build
```

## Критерии готовности

- [ ] `marketplace-links.json` в git: 109 записей, только article→{ozon,kaspi}
- [ ] Сидер на dev: updated 109, идемпотентен (повторный запуск без изменений)
- [ ] SQL: 109 SKU с обеими ссылками; TANAR-001 содержит ожидаемый ozon-id
- [ ] tools-сервис в compose объявлен (конфиг валиден: `docker compose -f docker-compose.prod.yml config -q` с фиктивным .env не падает на синтаксисе)
- [ ] typecheck, lint, build — exit 0
