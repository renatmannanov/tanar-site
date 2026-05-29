# Шаг 8: Удалить src/data/products.ts, src/lib/product.ts, старое ESLint-правило

> Зависит от: шаг 7
> Статус: [ ] pending

## Задача

Завершить переход — удалить старые источники правды и ESLint-правило про них.

### Порядок действий (строго по шагам)

1. Создать `src/core/db/seed-data.ts` (см. ниже).
2. Переписать `src/core/db/seed.ts` чтобы он импортировал данные из `./seed-data`, а не из `@/data/products`.
3. Запустить `npm run db:reset && npm run db:seed` — должно отработать (seed теперь читает свой источник).
4. Удалить `src/data/products.ts`, папку `src/data/` если пуста, `src/lib/product.ts`.
5. Удалить из `eslint.config.mjs` все блоки про `@/data/products` (общий запрет + исключение для `lib/product.ts` + исключение для `seed.ts`).
6. `npm run lint` + `npm run typecheck` — должны быть зелёные.
7. `npm run test:e2e` — все зелёные.

Порядок важен: если удалить файлы (шаг 4) ДО переезда seed на новый источник (шаги 1-2) — `seed.ts` упадёт с unresolved import при попытке `npm run db:seed`.

### Удалить

1. **`src/data/products.ts`** — удалить файл целиком.
2. **`src/lib/product.ts`** — удалить файл целиком.
3. **Папка `src/data/`** если пуста — удалить.
4. **`src/lib/gradients.ts`** — НЕ удалять (используется в `core/catalog/gradient.ts` и `Placeholder`).
5. **`src/lib/blog.ts`** — НЕ удалять (используется блогом).

### Удалить из `eslint.config.mjs`

Найти и удалить блок:
```js
{
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@/data/products",
        message: "...",
      }],
    }],
  },
},
{
  files: ["src/lib/product.ts"],
  rules: { "no-restricted-imports": "off" },
},
```

И удалить добавленное в шаге 6 исключение для `src/core/db/seed.ts`:
```js
{
  files: ["src/core/db/seed.ts"],
  rules: { "no-restricted-imports": "off" },
},
```

(Само правило про модульные границы из шага 4 ОСТАЁТСЯ — оно про другое.)

### Обновить seed-скрипт

`src/core/db/seed.ts` теперь не может импортировать `@/data/products` (файла нет). Перенести легаси-данные **внутрь самого seed-скрипта** как локальную константу `LEGACY_PRODUCTS` со структурой исходного массива (типизированной inline). Это финальный жилец легаси-формата — нужен для re-seed в dev, чтобы поднимать БД с тестовыми товарами.

Альтернатива: вынести в `src/core/db/seed-data.ts` рядом с seed.ts (тоже в core/db, граница не нарушается). **РЕШЕНИЕ:** выносим в `src/core/db/seed-data.ts` — чище.

```
src/core/db/
  seed.ts                ← остаётся
  seed-data.ts           ← массив товаров для re-seed (бывший src/data/products.ts, со ВСЕМИ товарами из источника — содержимое копируется как есть, число не хардкодим)
  reset.ts
  client.ts
  schema.ts
  migrations/
```

`seed.ts` импортирует `./seed-data` — это легально (внутри модуля core/db).

`seed-data.ts` импортирует типы из `@/core/catalog` (`Product` уже async — но тип-то тот же), либо описывает свой локальный тип легаси-формата с `comingSoon?: boolean`. **РЕШЕНИЕ:** локальный тип внутри seed-data.ts, не зависит от core/catalog. Это снимает зависимость seed-механизма от схемы продакшен-типов.

### Проверка

```powershell
Test-Path src\data\products.ts          # должно быть False
Test-Path src\data                       # False (папка удалена)
Test-Path src\lib\product.ts             # False
Test-Path src\lib\gradients.ts           # True (живёт)
Test-Path src\lib\blog.ts                # True (живёт)
Test-Path src\core\db\seed-data.ts       # True
```

Grep:
```powershell
Select-String -Path src\**\*.ts, src\**\*.tsx -Pattern "@/data/products"
# 0 совпадений
Select-String -Path src\**\*.ts, src\**\*.tsx -Pattern "@/lib/product"
# 0 совпадений (только заголовочный комментарий если есть — но импортов нет)
```

## Тесты

- ВСЕ существующие e2e зелёные.
- `npm run db:seed` продолжает работать (теперь читает из `seed-data.ts`).

## Команды для верификации (PowerShell)

```powershell
# Предусловие: .env.local с DATABASE_URL существует, postgres-dev запущен.
npm run db:up

npm run typecheck                              # без ошибок
npm run lint                                   # без ошибок
npm run build                                  # без ошибок (force-dynamic: билд не читает БД)
npm run db:reset                               # очищает БД
npm run db:seed                                # повторно наполняет; печатает "seed OK" с актуальными числами
npm run test:e2e                               # ВСЕ зелёные
Select-String -Path src\**\*.ts, src\**\*.tsx -Pattern "@/data/products"   # 0
Select-String -Path src\**\*.ts, src\**\*.tsx -Pattern "@/lib/product"      # 0
```

## Критерии готовности

- [ ] `src/data/products.ts`, `src/data/` папка, `src/lib/product.ts` удалены
- [ ] `src/lib/gradients.ts`, `src/lib/blog.ts` остались
- [ ] `src/core/db/seed-data.ts` создан со ВСЕМИ товарами из бывшего `src/data/products.ts` (содержимое скопировано как есть) и локальным типом легаси-формата
- [ ] `eslint.config.mjs`: правила про `@/data/products` и исключения для `lib/product.ts` и `seed.ts` удалены; правила границ модулей из шага 4 остались
- [ ] Grep `@/data/products` и `@/lib/product` по `src/` — 0 совпадений
- [ ] `npm run db:reset && npm run db:seed` отрабатывает; seed.ts печатает `seed OK: {...}` без mismatch (числа сверяются сами с источником seed-data.ts)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` + `npm run test:e2e` — всё зелёное
- [ ] Коммит: `refactor: remove legacy src/data/products.ts and src/lib/product.ts`
