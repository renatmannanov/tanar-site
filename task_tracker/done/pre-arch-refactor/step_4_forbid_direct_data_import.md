# Шаг 4: Запретить прямой импорт @/data/products в обход слоя

> Зависит от: нет (но коммитим последним из рефактор-шагов)
> Статус: [ ] pending

## Задача

Сделать `@/lib/product` единственной точкой доступа к данным товаров и запретить прямой импорт `@/data/products` остальному коду — это будущая «точка подмены» на БД.

### Порядок действий (строго по шагам, не менять последовательность)

**Действие 1.** В `src/lib/product.ts` добавить новый аксессор (его сейчас нет):
```ts
export function getAllProducts(): Product[] {
  return products;
}
```

**Действие 2.** Перевести нарушителей на слой. Сейчас прямой импорт `@/data/products`:
- `src/app/catalog/page.tsx` — импорт `{ products }`, использует `products.filter(p => p.category === active)` (или текущее состояние после шага 1 — фильтрация выполняется так же на массиве `products`).
- `src/components/home/FeaturedProducts.tsx` — импорт `{ products }`, использует `products.slice(0, 4)`.

Конкретные замены (фиксированы, без альтернатив):
- **`catalog/page.tsx`:** заменить `products.filter(...)` на вызов `getProductsByCategory(active)` (функция уже есть в product.ts, принимает `ProductCategory | null` и при `null` возвращает все). Удалить импорт `@/data/products`.
- **`FeaturedProducts.tsx`:** заменить `products.slice(0, 4)` на `getAllProducts().slice(0, 4)` (НЕ `getProductsByCategory(null).slice(0, 4)` — мы используем именно `getAllProducts`). Удалить импорт `@/data/products`.

**Действие 3.** Запустить `npm run lint` и `npm run typecheck` — должны быть зелёными (правило ESLint ещё не добавлено, но и нарушений `@/data/products` вне `src/lib/product.ts` уже нет, и неиспользуемых импортов тоже).

**Действие 4.** Добавить ESLint-правило (см. ниже секцию «ESLint-правило»).

**Действие 5.** Повторить `npm run lint` — должно остаться зелёным (правило не ловит легитимный импорт в `src/lib/product.ts`). Ручная проверка что правило работает — в секции «Проверка правила».

### ESLint-правило (Действие 4)

Конфиг проекта — **flat config** `eslint.config.mjs` (подтверждено): массив из `compat.extends(...)` + объект с `ignores`. Добавить ДВА объекта в массив `eslintConfig` (после существующих):

```js
// 1) общий запрет
{
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@/data/products",
        message: "Импортируй данные товаров только через @/lib/product (будущая точка подмены на БД).",
      }],
    }],
  },
},
// 2) исключение для самого слоя
{
  files: ["src/lib/product.ts"],
  rules: { "no-restricted-imports": "off" },
},
```

Порядок важен: объект-исключение должен идти ПОСЛЕ общего правила (flat config применяет по порядку, последний выигрывает для совпавших files).

> Все импорты в проекте используют alias `@/data/products` (не относительные пути), поэтому `paths` достаточно, `patterns` не нужны.

### Проверка правила (Действие 5, ручная)

Убедиться, что правило реально срабатывает на нарушении. PowerShell:
```powershell
# создаём временный файл-пробу с нарушением
"import { products } from '@/data/products'`nexport default products" | Out-File -Encoding utf8 src\_eslint_probe.ts
# ожидаем что lint вернёт ненулевой exit code и сообщение про @/data/products
npx eslint src\_eslint_probe.ts
# удаляем пробу — НЕ оставлять в коммите
Remove-Item src\_eslint_probe.ts
```
После проверки временный файл должен быть удалён (его не должно быть в `git status` перед коммитом).

## Тесты

- `npm run lint` зелёный после перевода нарушителей и после добавления правила.
- e2e зелёные — поведение не изменилось.

## Команды для верификации

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:e2e
# убедиться что прямых импортов data не осталось (кроме lib/product.ts):
Select-String -Path src\app\**\*.tsx, src\components\**\*.tsx -Pattern "@/data/products"
```

## Критерии готовности

- [ ] `getAllProducts(): Product[]` добавлен в `src/lib/product.ts`
- [ ] `catalog/page.tsx` использует `getProductsByCategory(active)`, импорт `@/data/products` удалён
- [ ] `FeaturedProducts.tsx` использует `getAllProducts().slice(0, 4)`, импорт `@/data/products` удалён
- [ ] ESLint `no-restricted-imports` запрещает `@/data/products` (два объекта в `eslint.config.mjs` — общий запрет + исключение для `src/lib/product.ts`, в указанном порядке)
- [ ] `npm run lint` проходит после действий 1-2 (до добавления правила) и после действия 4 (с правилом)
- [ ] Ручная проверка через временный файл-пробу подтверждает, что правило ловит нарушение; временный файл удалён
- [ ] Команда `Select-String -Path src\app\**\*.tsx, src\components\**\*.tsx -Pattern "@/data/products"` возвращает **0 совпадений**
- [ ] `npm run build` + `npm run test:e2e` зелёные
- [ ] Коммит: `refactor(data): forbid direct @/data/products import outside product layer`
