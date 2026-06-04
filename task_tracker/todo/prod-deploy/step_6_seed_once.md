# Шаг 6: Разовый сид каталога на проде

> Зависит от: шаг 5 (миграции применены — таблицы есть).
> Статус: [ ] pending

## Задача

Залить боевой каталог (12/30/109) в прод-БД ОДИН РАЗ. Ослабить guard в `seed.ts` для осознанного разового запуска. Фото в сид не входят (зальём в шаге 9).

> **ДЕСТРУКТИВНО:** `seed.ts` делает `TRUNCATE products, product_variants, skus, media_assets CASCADE`. На проде запускать ТОЛЬКО на чистой БД (сразу после миграций, до любого ручного ввода) и ТОЛЬКО под явным подтверждением пользователя. После первого сида — НИКОГДА повторно на проде (снесёт каталог и фото-привязки).

### 6а. Ослабить guard + ПРЕДОХРАНИТЕЛЬ — `src/core/db/seed.ts`
Текущий guard (строка ~16):
```ts
const url = process.env.DATABASE_URL ?? '';
if (!/tanar_dev|tanar_test/.test(url)) {
  throw new Error(`DATABASE_URL must point to tanar_dev or tanar_test for seed/reset; got: ${url}`);
}
```
Заменить на (env-guard здесь, на верхнем уровне):
```ts
const url = process.env.DATABASE_URL ?? '';
const allowProd = process.env.ALLOW_PROD_SEED === '1';
if (!/tanar_dev|tanar_test/.test(url) && !allowProd) {
  throw new Error(
    `DATABASE_URL must point to tanar_dev/tanar_test (or set ALLOW_PROD_SEED=1 for a deliberate one-off prod seed); got: ${url}`,
  );
}
if (allowProd) {
  console.warn('⚠️  ALLOW_PROD_SEED=1 — seeding a NON-dev database. One-off only.');
}
```

**ФИКС ревью (критично) — предохранитель от повторного TRUNCATE на проде.** `seed.ts` делает `TRUNCATE ... CASCADE`. На dev это норма (пересев каталога), но на проде повторный запуск СНЕСЁТ заполненный каталог + media_assets (фото-привязки). Добавить В `main()` ПЕРЕД `TRUNCATE` проверку: если это не-dev БД (allowProd) И каталог уже НЕ пустой — отказать.
```ts
// inside main(), before TRUNCATE:
if (allowProd) {
  const existing = await db.$count(schema.products);
  if (existing > 0) {
    throw new Error(
      `ALLOW_PROD_SEED refused: target DB already has ${existing} products. ` +
      `Prod seed is one-off on an EMPTY catalog only — TRUNCATE would destroy the live catalog and photo links.`,
    );
  }
}
```
- На dev (без allowProd) — поведение прежнее (TRUNCATE+пересев), e2e/dev НЕ затронуты.
- На проде — сид сработает ТОЛЬКО на пустом каталоге; второй запуск физически невозможен (откажет). Это предохранитель в КОДЕ, а не только в тексте инструкции.

### 6а-bis. Флаг ALLOW_PROD_SEED — ТОЛЬКО inline (не в .env)
**Не** прописывать `ALLOW_PROD_SEED` в `.env`/compose (см. шаг 2: `seed`-сервис без этого env). Передавать ТОЛЬКО в момент запуска (`-e ALLOW_PROD_SEED=1`), чтобы флаг не «жил» в окружении контейнера и не мог сработать при случайном повторном `run`.

### 6б. Запуск сида на проде (сервис `seed`, profile `tools` — УЖЕ описан в шаге 2)
Сервис `seed` определён в `docker-compose.prod.yml` ещё в шаге 2 (builder-образ, command = tsx seed.ts, БЕЗ ALLOW_PROD_SEED в env). Здесь — только запуск с inline-флагом:
```
docker compose -f docker-compose.prod.yml --profile tools run --rm -e ALLOW_PROD_SEED=1 seed
```
- DATABASE_URL берётся из env сервиса (на postgres:5432/<prod-db>).
- Флаг `ALLOW_PROD_SEED=1` — ТОЛЬКО здесь, inline (не в .env). После выполнения он нигде не остаётся.

### 6в. Проверка после сида
- 12 товаров в БД, self-check сида прошёл (он сам кидает при mismatch; ждёт price=80000, article TANAR-001).
- Витрина прода `/catalog` → 12 карточек (на градиентах, фото нет).
- `/catalog/jacket-sv7-goretex` → 200, виден бейдж/размеры.
- `/admin/login` → пускает.

## Тесты
- Локально сэмулировать прод-сид: поднять prod-стек с тест-БД (имя НЕ tanar_dev/test, напр. tanar_prod_local), прогнать сид с `ALLOW_PROD_SEED=1` на ПУСТОЙ БД → 12 товаров.
- **Предохранитель:** повторный запуск с тем же флагом (каталог уже не пуст) → отказ с ошибкой «already has N products», БЕЗ TRUNCATE. Проверить, что данные на месте после отказа.
- Проверить, что БЕЗ флага на не-dev БД сид падает (env-guard).
- Существующие dev `db:seed` / e2e afterAll — НЕ затронуты (url содержит tanar_dev/test → ветка allowProd не активна, предохранитель count не применяется, прежний TRUNCATE+пересев работает).

## Команды для верификации
```powershell
# Guard всё ещё защищает (без флага на prod-имени БД → ошибка):
#   ожидаем throw "DATABASE_URL must point to tanar_dev/tanar_test (or set ALLOW_PROD_SEED=1...)"
# Разовый сид с флагом:
docker compose -f docker-compose.prod.yml --profile tools run --rm -e ALLOW_PROD_SEED=1 seed npx tsx -r tsconfig-paths/register src/core/db/seed.ts
# Проверить кол-во:
docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM products;"   # 12
```

## Критерии готовности
- [ ] `seed.ts` env-guard ослаблен через `ALLOW_PROD_SEED=1`; по умолчанию dev/test-only (e2e/dev не затронуты)
- [ ] **Предохранитель в коде:** при allowProd и непустом каталоге (count>0) — отказ ДО TRUNCATE (повторный прод-сид невозможен)
- [ ] `ALLOW_PROD_SEED` НЕ в .env/compose — только inline при запуске
- [ ] Локальная эмуляция: на пустой БД с флагом — 12 товаров; повторно — отказ без потери данных; без флага — падает
- [ ] На проде после сида: 12 товаров, `/catalog` показывает каталог, `/admin/login` работает
- [ ] Деструктивный запуск выполнен под явным подтверждением пользователя
- [ ] Коммит: `feat(db): one-off prod seed guard (ALLOW_PROD_SEED + empty-catalog safeguard)`
