# Шаг 5: ProductForm (create|edit) + маппер productToInput

> Зависит от: шаг 3 (ui-примитивы), шаг 4 (список — точка входа)
> Статус: [ ] pending

## Задача

Универсальная форма товара `mode: 'create' | 'edit'` со всеми полями `ProductInput`, редактором вариантов/SKU, неактивными create/delete и фото-слотом. В Плане B используется только на edit; форма пишется в ПОЛНОМ виде (План C только снимет disabled).

### Маппер — `src/app/admin/catalog/product-mapper.ts`
- `productToInput(p: Product): ProductInput` — adapter read→write (имена полей разные!):
  - `price → priceBase`, `id/name/category/status/description/specs/label/care/marketplaces` как есть;
  - `variants[].id → colorId`, `variants[].label → colorLabel`, `hex/models/hasFlatShots` как есть;
  - `variant.skus[]`: `{ size, ruSize, article, priceOverride, stockQty }` (drop `id`, `reservedQty`).
- Чистая функция, без БД. Покрыть мысленно крайние случаи: `label?`/`care?` undefined → пробрасываются.

### Компонент — `src/components/admin/ProductForm.tsx` (`'use client'`)
- Проп `{ mode: 'create' | 'edit', initial?: ProductInput, action: (input: ProductInput) => Promise<{error?: string}> }`.
- Состояние формы — controlled (`useState<ProductInput>`), инициализация из `initial` (edit) или дефолта (create).
- **Поля товара:** slug (в edit — readonly, slug = идентификатор), name, category (Select из `CATEGORIES`), status (Select из ProductStatus), priceBase (number), description (Textarea), label.badge, label.sub, care (Textarea).
- **Редактор вариантов:** список вариантов; на каждый — colorId, colorLabel, hex (color input). Внутри варианта — список SKU: size, ruSize, article, stockQty (number). Добавление/удаление вариантов и SKU — кнопки (в edit активны: меняем существующий товар; форма шлёт целиком, `updateProduct` заменяет дерево).
- **Submit:** собирает `ProductInput` из state → `await action(input)`; при `{error}` показывает его; иначе action сам редиректит. Использовать `useActionState`/`useTransition` для pending-состояния кнопки.
- **Неактивные (План C):**
  - кнопка **«Удалить товар»** — `disabled`, тултип «Доступно в Плане C».
  - блок **«Фото»** — заглушка-слот (рамка «Загрузка фото — План C»), `disabled`. Никаких вызовов media (реализации нет).
  - в `mode:'create'` кнопка submit назвалась бы «Создать» — но create-страницы в Плане B нет; компонент готов, не вызывается с create.

> Форма НЕ знает про БД. Вся запись — через проп `action` (server action из шага 6).

## Тесты
- e2e редактирования — шаг 7.

## Команды для верификации
```powershell
npm run typecheck   # типы ProductInput/VariantInput/SkuInput сходятся, маппер компилируется
npm run lint
```
(Полная проверка формы — в шаге 6, когда подключим к edit-странице и action.)

## Критерии готовности
- [ ] `productToInput(p)` маппит Product→ProductInput (price→priceBase, id→colorId, label→colorLabel, skus без id/reservedQty)
- [ ] `ProductForm` принимает `mode/initial/action`, рендерит все поля ProductInput + редактор вариантов/SKU
- [ ] Кнопка «Удалить» и блок «Фото» — `disabled` (в DOM)
- [ ] Форма не импортирует core/db напрямую (только типы из @/core/catalog), запись — через проп action
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(admin): universal ProductForm (edit) + Product→Input mapper; create/delete/photo disabled`
