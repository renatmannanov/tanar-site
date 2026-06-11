# Progress Log — marketplace-sku-links

## Контекст для агента

Факты, которых нет в коде (решения — в PLAN.md «Ключевые решения»):

- **Источник данных:** `internal/content-source/TANAR_links.csv` — 432 строки,
  109 товарных позиций, у ВСЕХ есть обе ссылки. `internal/` в gitignore →
  на прод данные едут через закоммиченный `src/core/db/marketplace-links.json`.
  В CSV многострочные quoted-описания — наивный split('\n') НЕ работает.
- **Ключ матчинга:** колонка «Артикул Ozon» (TANAR-001…109) == `skus.article`
  (заполнен у всех 109 SKU в dev и prod, уникален).
- **Kaspi не группирует варианты** (каждый цвет+размер — отдельная карточка),
  Ozon группирует (12 «ID группы» == наши 12 товаров; любая SKU-ссылка
  открывает группу с предвыбранным вариантом). Поэтому хранение — per-SKU.
- **Продуктовые поля ссылок на проде ПУСТЫЕ** (заказчица не заполняла) —
  до выбора размера кнопок МП на проде не будет и после этого плана. Принято.
- **`npm run build` НЕЛЬЗЯ при работающем dev-сервере** (затирает .next).
- **Client-компоненты импортят только `/client`-входы** — server barrel тянет
  postgres в бандл; ловится только `npm run build`.
- **upsertSkus сохраняет reservedQty** (НЕ добавлять его в set) и пишет
  inventory_log(manual) при изменении stockQty — не сломать при добавлении
  marketplaces в set.
- **zod v4:** для частичных мап — `z.partialRecord` (z.record с enum exhaustive).
- **e2e-грабли:** слаги — по канон-таблице src/lib/slugify (Ц→c!); login()
  один раз на тест (повторный виснет — redirect с готовой cookie); очистка:
  сначала заказы, потом товар (FK); admin.spec и admin-marketplaces.spec в
  afterAll гоняют `npm run db:seed` → ВСЕ таблицы перезаливаются (включая
  sku.marketplaces — после полного прогона перезапустить `db:seed-mp-links`,
  если проверяешь руками).
- **Деплой-грабля:** `docker compose build --no-cache` НЕ пересобирает образы
  профиля tools — `migrate` и `seed-marketplace-links` собирать отдельно
  (`--profile tools build --no-cache <name>`), иначе старый образ бежит по
  старым файлам и врёт «successfully».
- **Плейсхолдер `https://…`** уже используется в продуктовых полях — у
  sku-инпутов тот же.

## Learnings

- **`hidden`-атрибут не работает вместе с Tailwind `flex` на том же элементе:**
  утилита `.flex` перебивает UA-правило `[hidden]{display:none}` (равная
  специфичность, utilities позже preflight). Панель таба «скрытая» оставалась
  видимой — e2e поймал. Фикс: display-класс делать условным
  (`tab === 'x' ? 'flex flex-col gap-6' : 'hidden'`), атрибут `hidden`
  оставлен для семантики.

---
