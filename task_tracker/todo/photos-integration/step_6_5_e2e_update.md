# Step 6.5: Обновление Playwright e2e тестов под новые категории

> Статус: pending

## Цель

Обновить smoke-тесты в `e2e/` чтобы они проходили после изменений каталога:
- Удалены категории "Рюкзаки" и "Аксессуары"
- Добавлены "Худи", "Штаны", "Шорты"
- Slug'и старых товаров (`shell-jacket-khan` остался, но `backpack-charyn-40l`, `gloves-zailiysky` и т.д. — удалены)
- На странице товара теперь есть свотчи цвета и галерея

## Что точно ломается прямо сейчас (без правок)

`e2e/catalog.spec.ts:12`:
```ts
for (const label of ['Все', 'Куртки', 'Рюкзаки', 'Аксессуары', 'Футболки']) {
```

После step_4 категорий "Рюкзаки" и "Аксессуары" не будет — тест упадёт.

## Действия

### 1. Найти все референсы на удаляемые сущности

```bash
grep -rn "Рюкзаки\|Аксессуары\|backpack\|accessor" e2e/
grep -rn "backpack-charyn\|assault-merke\|city-shymbulak\|trekking-kolsai\|trail-running-burabai\|beanie-burabai\|gloves-zailiysky\|buff-kaskelen\|belt-kapshagai\|sunglasses-altyn-emel\|tee-logo\|tee-khan-tengri\|longsleeve-sunrise\|tee-mountain-contour\|tee-ridge-pocket" e2e/
```

Все найденные места обновить.

### 2. Обновить чипы категорий

`e2e/catalog.spec.ts`: заменить массив на новые категории:
```ts
for (const label of ['Все', 'Куртки', 'Худи', 'Футболки', 'Штаны', 'Шорты']) {
```

### 3. Обновить slug'и в e2e/product.spec.ts (и других)

Проверить что используются slug'и из нового каталога:
- `shell-jacket-khan` ✅ (остался)
- `light-jacket-tengri` ✅ (был `parka-tengri`, теперь slug изменился — обновить)
- `hoodie-alatau`, `hoodie-turgen`, `tshirt-tanar` (новые)
- `pants-charyn`, `shorts-burabai` (заглушки)

Если в тестах был хардкод вроде `await page.goto('/catalog/parka-tengri')` — заменить на новый slug.

### 4. Добавить тесты для новой функциональности (по желанию)

Если хочется покрыть новое поведение — добавить минимальные проверки:

```ts
// e2e/product.spec.ts
test('color picker on product page', async ({ page }) => {
  await page.goto('/catalog/shell-jacket-khan');
  await expect(page.getByText(/Цвет:/)).toBeVisible();
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(1);
});

test('coming soon products show badge', async ({ page }) => {
  await page.goto('/catalog/pants-charyn');
  await expect(page.getByText(/Скоро/i)).toBeVisible();
});
```

Это **опционально** — главное чтобы старые тесты не падали. Новые добавим только если осталось время.

### 5. Проверить что фильтр в каталоге переключается корректно

Если был тест на `await page.click('text=Куртки')` — он должен остаться рабочим (Куртки не удалили).
Если был тест на `await page.click('text=Рюкзаки')` — заменить на `Худи` или удалить.

## Критерии готовности

- [ ] `npm run test:e2e` — все тесты зелёные
- [ ] Никаких упоминаний "Рюкзаки", "Аксессуары" в `e2e/` (кроме комментариев "removed")
- [ ] Никаких ссылок на удалённые slug'и в `e2e/`

## Verification

```bash
npm run build
npm run test:e2e
grep -rn "Рюкзаки\|Аксессуары" e2e/ || echo "✓ no traces"
```

## Что НЕ делать

- НЕ удалять файлы тестов целиком — только обновить содержимое
- НЕ переписывать всю архитектуру тестов — точечные правки
- НЕ добавлять много новых тестов в этот шаг — focus на то чтобы старые не падали

## Когда выполняется

Этот шаг идёт **после step_6** (когда каталог уже обновлён) и **до step_8** (финальной проверки). Логически — последний шаг кода перед completion.
