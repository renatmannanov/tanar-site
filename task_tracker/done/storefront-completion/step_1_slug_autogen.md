# Шаг 1: Автоген slug при создании (транслит)

> Зависит от: нет. ВАЖНО: шаг 2 (specs) тоже правит `ProductForm.tsx` — выполнять 1 → 2 последовательно.
> Статус: [ ] pending

## Задача

slug на странице создания генерируется автоматически из `name` транслитерацией кириллицы. Поле slug видимое, но read-only (юзер не правит руками — видит, что получится).

### Транслитератор — `src/lib/slugify.ts` (новый, client-safe)
- Чистая функция `slugify(input: string): string`. БЕЗ node/server-импортов (используется в client ProductForm).
- **КАНОНИЧЕСКАЯ таблица транслита (зафиксирована — e2e шага 5 на неё опирается, отклоняться НЕЛЬЗЯ):**
  ```
  а→a б→b в→v г→g д→d е→e ё→e ж→zh з→z и→i й→y к→k л→l м→m н→n о→o
  п→p р→r с→s т→t у→u ф→f х→h ц→c ч→ch ш→sh щ→sch ъ→'' ы→y ь→'' э→e ю→yu я→ya
  ```
  (применять и к заглавным — сначала lowercase, потом транслит).
- Логика по порядку:
  1. lowercase.
  2. Транслит кириллицы по таблице выше.
  3. Латиница/цифры — оставить; всё остальное (пробелы, спецсимволы, `®`, `™`, `/`, и т.д.) → дефис.
  4. Схлопнуть повторы дефисов в один; обрезать дефисы по краям (`replace(/^-+|-+$/g,'')`).
- Результат ДОЛЖЕН проходить `^[a-z0-9-]+$` (zod в productInputSchema). Если на выходе пусто (name из одних спецсимволов, напр. `slugify('®™ / ')` → `''`) — вернуть `''` (обработка — ниже, дизейбл кнопки).
- Примеры (проверить в tsx-тесте):
  - `"Куртка SV7 Gore-Tex®"` → `"kurtka-sv7-gore-tex"`
  - `"Тестовая Куртка X1"` → `"testovaya-kurtka-x1"`
  - `"®™ / "` → `""`

### ProductForm (`src/components/admin/ProductForm.tsx`)
- Импорт `slugify` из `@/lib/slugify`.
- **create-режим:** slug-поле — `readOnly` ВСЕГДА (убрать прежний `onChange` на slug, добавленный в Плане C). При изменении `name` — пересчитывать `slug = slugify(name)` (в обработчике onChange поля name: `patch({ name: v, slug: mode === 'create' ? slugify(v) : form.slug })`).
- Подпись поля на create: «Slug (генерируется из названия)». Подсказку про ручной ввод убрать.
- edit-режим: slug read-only и неизменен (как сейчас) — name на edit slug НЕ меняет.
- **Пустой slug (защита от 500):** кнопка «Создать» (submit, mode==='create') — `disabled` когда `form.slug.trim() === ''` (в дополнение к `pending`). Иначе пустой slug уйдёт в zod `min(1)` → ValidationError → 500. На edit это не нужно (slug там всегда заполнен).

### Slug-коллизия → автоинкремент суффикса (решение пользователя)
Дубль решается АВТОМАТИЧЕСКИ: `kurtka` занят → система берёт `kurtka-2`, `kurtka-3`... Заказчица о slug не думает, поле остаётся read-only.

**Функция подбора — `src/core/catalog/repository.ts`** (server):
- `ensureUniqueSlug(base: string): Promise<string>`:
  - SELECT всех slug, начинающихся с `base`: `where(or(eq(slug, base), like(slug, base + '-%')))` (или просто загрузить все и фильтровать в коде — товаров десятки, не проблема; зафиксировано: один SELECT `like(slug, base || '%')`, фильтрануть в JS на точные `base` / `base-N`).
  - Если `base` не занят → вернуть `base`.
  - Иначе найти максимальный суффикс N среди `base-N` и вернуть `base-(N+1)` (старт с `-2`, т.е. если занят только `base` → `base-2`).
  - Гарантировать результат матчит `^[a-z0-9-]+$` (base уже валиден, суффикс `-N` — цифры).
- Экспортировать из `@/core/catalog`.

**Где вызывается — `createProductAction`** (`src/app/admin/(protected)/catalog/actions.ts`):
- ПЕРЕД `createProduct`: `const uniqueSlug = await ensureUniqueSlug(input.slug); const finalInput = { ...input, slug: uniqueSlug };` → `createProduct(finalInput)` → `redirect('/admin/catalog/' + uniqueSlug + '/edit')` (редирект на ФАКТИЧЕСКИЙ slug, не на исходный!).
- **Страховка (один пользователь-админ, гонки маловероятны, но UNIQUE-constraint — последний рубеж):** оставить в `catch` проверку `23505` → `{ error: 'Не удалось подобрать уникальный slug, попробуйте другое название.' }`. Это fallback, основной путь — `ensureUniqueSlug`.

> Импорты в repository.ts: добавить `or`, `like` из `drizzle-orm` (eq уже есть).

### Обновить существующий e2e (иначе красный) — `e2e/admin-crud-media.spec.ts`
- Тест create (строка ~43) делает `page.locator('#slug').fill(TEST_SLUG)`. После этого шага поле `#slug` — `readOnly` всегда → Playwright не заполнит → тест упадёт.
- **Убрать строку `fill('#slug', ...)`**. slug теперь автоген из `#name`. `slugify('E2E Test Product')` = `'e2e-test-product'` = текущий `TEST_SLUG` — значит остальной тест (проверка URL `/admin/catalog/e2e-test-product/edit`) пройдёт без изменений. Только убрать ручной fill slug; name уже заполняется (`#name`).

## Тесты
- tsx-скрипт (разовый, удалить): `slugify('Куртка SV7 Gore-Tex®')` === `'kurtka-sv7-gore-tex'`, `slugify('Тестовая Куртка X1')` === `'testovaya-kurtka-x1'`, `slugify('®™ / ')` === `''`; проверить кириллицу, спецсимволы, повторные дефисы. Результат непустой матчит `/^[a-z0-9-]+$/`.
- `ensureUniqueSlug` — проверить в том же tsx-скрипте на dev-БД (или в e2e): для боевого `jacket-sv7-goretex` (занят) вернёт `jacket-sv7-goretex-2`; для несуществующего — сам base.
- e2e на UI (вкл. дубль) — шаг 5.

## Команды для верификации
```powershell
npm run typecheck
npm run lint
# tsx-проверка slugify (разовый скрипт scripts/_test_slugify.ts, потом удалить):
npx tsx scripts/_test_slugify.ts
```

## Критерии готовности
- [ ] `src/lib/slugify.ts` — чистая функция, без server-импортов; таблица транслита = канон выше
- [ ] `slugify` корректно: `'Куртка SV7 Gore-Tex®'`→`'kurtka-sv7-gore-tex'`, `'Тестовая Куртка X1'`→`'testovaya-kurtka-x1'`, `'®™ / '`→`''`; результат непустой матчит `^[a-z0-9-]+$`
- [ ] ProductForm create: ввод названия → slug пересчитывается автоматически, поле read-only
- [ ] ProductForm create: кнопка «Создать» disabled при пустом slug
- [ ] ProductForm edit: slug read-only, name его не меняет
- [ ] `ensureUniqueSlug`: занятый `base` → `base-2`; занятые `base`+`base-2` → `base-3`; свободный → `base`
- [ ] `createProductAction` использует `ensureUniqueSlug`, редиректит на фактический slug; `23505` в catch как страховка (не 500)
- [ ] `e2e/admin-crud-media.spec.ts`: убран `fill('#slug')`, тест зелёный (`npm run test:e2e`)
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(admin): auto-generate slug from name (cyrillic transliteration)`
