# Progress Log — cart-inventory

## Контекст для агента

Факты, которые не очевидны из кода (решения — в PLAN.md «Ключевые решения»):

- **Миграций в плане НЕТ.** `skus.stockQty/reservedQty` и `inventory_log` существуют
  с миграции 0000. `npm run db:generate` не должен создавать файлов — если создал,
  что-то пошло не так.
- **Остатки уже заведены**: dev и прод — 96/109 SKU со стоком (sum 1052). Сид берёт
  цифры из catalog-snapshot.json. У `jacket-sv7-goretex` сток 4–21 по всем SKU —
  существующие cart/checkout/admin-orders спеки (qty ≤ 2) проходят без правок.
- **e2e с контролируемым стоком — ТОЛЬКО на самосозданных товарах** (паттерн —
  блок coming_soon в e2e/cart.spec.ts: создание через админ-UI в beforeAll,
  удаление в afterAll). Чужие остатки трогать нельзя (сид общий).
- **Порядок очистки в e2e: сначала заказы, потом товар.** FK `order_items.skuId → skus`
  без cascade — удаление товара с «живыми» позициями заказов падает (поведение
  существовало и до плана).
- **FK inventory_log без cascade** (skuId → skus, refOrderId → orders): чистка —
  шаг 2 §3 (deleteOrder обнуляет refOrderId) и §5 (удаление SKU/товара удаляет
  его строки журнала). Без этого admin-crud-media и afterAll-очистки упадут.
- **`Sku` в client-props уже несёт stockQty/reservedQty** (тип в
  src/core/catalog/types.ts) — витрине новые выборки не нужны.
- **Client-компоненты импортят ТОЛЬКО `/client`-входы** (`@/core/inventory/client`,
  `@/core/orders/client`, `@/core/catalog/client`) — server barrel тянет postgres
  в бандл; typecheck/lint НЕ ловят, ловит только `npm run build`. Гонять build
  на каждом шаге.
- **`npm run build` НЕЛЬЗЯ запускать при работающем dev-сервере** — затирает
  `.next`, dev падает с ENOENT buildManifest (урок 2026-06-10). Сначала стоп dev.
- **upsertSkus сохраняет reservedQty** (UPDATE без этого поля — сознательно).
  Правки шага 6 не должны это сломать.
- **Playwright reuseExistingServer: true, порт 3001**; полному прогону нужен
  `PHOTOGEN_FAKE=1` (сам поднимет сервер). e2e-спеки site-admin/cart перезаписывают
  site_settings.whatsapp — после прогона вернуть тестовый номер, если проверяется
  вручную.
- **Идемпотентность переходов** держится на том, что transitionOrderItems получает
  СТАРЫЙ статус из строки заказа, залоченной FOR UPDATE в той же транзакции,
  где статус обновляется. Не выносить чтение старого статуса из транзакции.
- **zod v4:** `z.record(z.enum, …)` exhaustive — для частичных мап `z.partialRecord`
  (грабля из cart-whatsapp).
- Удаление done-заказа НЕ возвращает остаток (удаление записи ≠ отмена продажи);
  возврат на склад — только через статус «Отменён».
- **admin-orders.spec на sv7 — net zero по резерву**: тест подтверждает заказ,
  но сам же его удаляет (delete confirmed → release). Повторные прогоны без
  db:seed резерв НЕ копят. Порядок шагов внутри теста не менять.
- **План прошёл 4-агентное ревью** (`_review_summary.md`), все 7 рекомендаций
  внесены в step-файлы 2026-06-10. `_review_*.md` — справочные, при работе
  по шагам их читать не нужно.

## Learnings

(заполняется в процессе работы)

---
