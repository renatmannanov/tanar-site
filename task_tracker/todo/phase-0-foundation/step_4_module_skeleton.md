# Шаг 4: Скелет модулей src/core/* + границы + tsconfig paths

> Зависит от: шаг 2 (db/client.ts уже создан в core/db)
> Статус: [ ] pending

## Задача

Завести структуру модулей `src/core/{catalog,inventory,orders,media,db,contracts}` + `src/marketplace/contract`. Каждый модуль имеет `index.ts` как публичный API. Описать общие типы в `core/contracts`. Настроить ESLint-правила границ модулей. Добавить TS-алиасы.

### Структура (создать пустые директории + файлы)

```
src/
  core/
    catalog/
      index.ts                  ← публичный API (пока пустой, заполнится в шаге 5)
    inventory/
      index.ts                  ← пустой
    orders/
      index.ts                  ← пустой
    media/
      index.ts                  ← пустой
    db/
      client.ts                 (уже создан в шагах 2-3)
      schema.ts                 (уже создан в шаге 3)
      migrations/               (уже создана)
      index.ts                  ← реэкспорт { db } from './client'; export * as schema from './schema';
    contracts/
      index.ts                  ← общие типы (см. ниже)
  marketplace/
    contract/
      index.ts                  ← пустой (Фаза 5 заполнит)
```

Для пустых `index.ts` написать комментарий-заглушку:
```ts
// Public API of the module. Other code must import only from here.
export {};
```

### `src/core/contracts/index.ts`

Переезжающие сюда типы (раньше были в `src/lib/product.ts`). Это контракты домена, известные всем модулям:

```ts
export type ProductCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts';
export type ProductStatus = 'draft' | 'published' | 'archived' | 'coming_soon';
export type ProductImageModel = 'man' | 'girl';
export type ProductImageView = 'front' | 'side' | 'back';
export type Marketplace = 'ozon' | 'kaspi';
export type MediaScope = 'product' | 'site' | 'blog';
export type OrderSource = 'site' | 'kaspi' | 'ozon' | 'wb';
```

(Бизнес-типы — `Product`, `ProductColor`, `Sku`, `GalleryShot`, `Order` — живут в соответствующих модулях, экспортируются через их `index.ts`. Сюда — только примитивные union'ы, без которых модули не договорятся.)

### Переключить inline-типы в schema.ts на импорт из contracts

В step 3 jsonb-поля были типизированы через `.$type<>()` с inline-литералами (потому что `@/core/contracts` ещё не существовал). Теперь contracts на месте — заменить inline-литералы в `src/core/db/schema.ts` на импорт:
```ts
import type { Marketplace, ProductImageModel } from '@/core/contracts';
```
и использовать их в `.$type<Partial<Record<Marketplace, string>>>()`, `.$type<ProductImageModel[]>()`. Проверить, что `import` идёт через публичный alias `@/core/contracts` (а не относительный путь — schema.ts в `core/db`, contracts в `core/contracts`, это межмодульный импорт публичного API → alias корректен и границы не нарушает). `npm run typecheck` зелёный после замены.

### tsconfig paths

Открыть `tsconfig.json`, в `compilerOptions.paths` добавить алиасы (помимо существующего `@/*`):
```json
"@/core/*": ["./src/core/*"],
"@/marketplace/*": ["./src/marketplace/*"]
```

(Существующий `@/*` остаётся — другие места его используют. Новые алиасы — это публичные имена модулей.)

### ESLint — правила границ (ключевой принцип)

**Принцип:** alias `@/core/*` и `@/marketplace/*` зарезервированы для **публичного API модулей** (то есть для импорта из ДРУГОГО модуля). Внутри своего модуля пишутся **относительные пути** (`./types`, `./images`). Это автоматически даёт границы: alias видит только то, что экспортирует `index.ts`; относительные пути работают только внутри одной папки.

То есть **никаких `off`-исключений** — правила просто не должны срабатывать на относительных путях, потому что они не матчат `@/core/*/*` паттерн.

В `eslint.config.mjs` добавить блоки **строго в указанном порядке** (порядок критичен, flat config применяет последнее совпадение):

```js
// Блок 1: общий запрет на импорт внутренностей модулей через alias.
// Срабатывает везде; внутри модуля используются относительные пути → не матчатся.
{
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        {
          group: ["@/core/*/*"],
          message: "Импортируй только из публичного API модуля: '@/core/<module>' через его index.ts. Внутри своего модуля используй относительные пути (./).",
        },
        {
          group: ["@/marketplace/*/*"],
          message: "Импортируй только из публичного API модуля marketplace: '@/marketplace/<module>'.",
        },
      ],
    }],
  },
},
// Блок 2: дополнительно — core/ НЕ зависит от marketplace/ (направление зависимостей).
// Запрещает любой импорт @/marketplace/* (даже публичного API) из файлов в src/core/**.
{
  files: ["src/core/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        {
          group: ["@/core/*/*"],
          message: "Импортируй только из публичного API модуля: '@/core/<module>'. Внутри своего модуля используй относительные пути (./).",
        },
        {
          group: ["@/marketplace/*", "@/marketplace/**"],
          message: "core/ не должен импортировать marketplace/. Зависимость только в обратную сторону.",
        },
      ],
    }],
  },
},
```

**Порядок блоков критичен — не менять местами:**
1. Блок 1 — общий запрет внутренностей (применяется ко всему коду).
2. Блок 2 — расширяет правило для `src/core/**`, добавляя ещё запрет на marketplace. flat config: последний матчящий выигрывает, поэтому в блоке 2 нужно **повторить** запрет на `@/core/*/*`, иначе он переопределится. (`no-restricted-imports` НЕ мержится между блоками — каждый блок задаёт правило целиком.)

> **Почему нет `"off"`-исключения для `src/core/**`** (как могло бы показаться нужным): внутри модуля используются ОТНОСИТЕЛЬНЫЕ пути (`./types`, `./images`, `../db`). Они не матчат паттерн `@/core/*/*` — правило их и так не ловит. А alias-импорт **из** модуля **в** свой же модуль (вида `@/core/catalog/types` из файла в `src/core/catalog/`) — это ошибка дисциплины, и пусть линтер его поймает.

Существующее правило про `@/data/products` (общий запрет + исключение для `src/lib/product.ts`) остаётся как есть — оно удалится в step 8.

### Проверка границ работает

После добавления правил — три намеренные пробы:
1. **Запрет внутренностей через alias.** Создать `src/app/_probe1.tsx` с `import x from '@/core/catalog/types'` → `lint` должен ругнуться сообщением про публичный API.
2. **Запрет marketplace из core.** Создать `src/core/catalog/_probe2.ts` с `import x from '@/marketplace/contract'` → `lint` должен ругнуться сообщением про обратную зависимость.
3. **Относительные пути ВНУТРИ модуля разрешены.** Создать `src/core/catalog/_probe3.ts` с `import x from './types'` → `lint` НЕ должен ругаться (это валидный внутренний импорт).
4. После проверок — все три файла удалить.

## Тесты

- E2e не затрагиваются.
- Lint должен оставаться зелёным на основной кодовой базе (нет реальных нарушений границ).

## Команды для верификации

```powershell
npm run typecheck                              # пустые index.ts + contracts корректны
npm run lint                                   # без ошибок (правила не ловят легитимный код)
# проверка что правила реально работают — через временные пробы (см. выше),
# финальное состояние: проб НЕТ, lint зелёный.
```

## Критерии готовности

- [ ] Папки `src/core/{catalog,inventory,orders,media,db,contracts}` и `src/marketplace/contract` существуют, каждая с `index.ts`
- [ ] `src/core/db/index.ts` реэкспортирует `db` и `schema`
- [ ] inline-типы jsonb в `src/core/db/schema.ts` (из step 3) заменены на импорт из `@/core/contracts`; typecheck зелёный; lint не ругается (импорт публичного API `@/core/contracts` — разрешённый межмодульный, паттерн `@/core/*`, не `@/core/*/*`)
- [ ] `src/core/contracts/index.ts` содержит примитивные union-типы домена (см. список выше)
- [ ] `tsconfig.json` имеет paths `@/core/*` и `@/marketplace/*`
- [ ] `eslint.config.mjs` содержит ДВА блока правил границ модулей в указанном порядке (общий запрет + расширение для src/core/**)
- [ ] Ручная проверка тремя пробами подтверждает: (a) alias-импорт внутренностей запрещён, (b) marketplace из core запрещён, (c) относительные пути внутри модуля разрешены; пробы удалены
- [ ] `npm run lint` + `npm run typecheck` зелёные
- [ ] Коммит: `feat(core): module skeleton with enforced boundaries`
