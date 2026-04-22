# Шаг 11: Полная верификация

> Зависит от: шаги 1–10
> Статус: [ ] pending

## Задача

Прогнать весь сайт через расширенные Playwright-тесты. Проверить end-to-end что ничего не упало.

### Порядок действий

1. **Создать `e2e/smoke.spec.ts`** — общая проверка всех страниц.

   Используем **фиксированные slug'и** из step_9 (они гарантированно существуют в данных):
   - Продукт: `shell-jacket-khan` → `/catalog/shell-jacket-khan`
   - Пост: `khan-tengri-ascent` → `/blog/khan-tengri-ascent`

   Структура spec:

   ```ts
   import { test, expect, Page } from '@playwright/test';

   const PRODUCT_SLUG = 'shell-jacket-khan';
   const POST_SLUG = 'khan-tengri-ascent';

   function collectErrors(page: Page) {
     const errors: string[] = [];
     page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
     page.on('console', msg => {
       if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
     });
     return errors;
   }

   test.describe('smoke', () => {
     const urls = [
       '/',
       '/catalog',
       `/catalog/${PRODUCT_SLUG}`,
       '/blog',
       `/blog/${POST_SLUG}`,
     ];

     for (const url of urls) {
       test(`no errors on ${url}`, async ({ page }) => {
         const errors = collectErrors(page);
         const response = await page.goto(url);
         expect(response?.status()).toBe(200);
         await expect(page.getByTestId('site-header')).toBeVisible();
         await expect(page.getByTestId('site-footer')).toBeVisible();
         expect(errors).toEqual([]);
       });
     }

     test('catalog shows 20+ product cards', async ({ page }) => {
       await page.goto('/catalog');
       const cards = page.getByTestId('product-card');
       expect(await cards.count()).toBeGreaterThanOrEqual(20);
     });

     test('catalog filter by jackets', async ({ page }) => {
       await page.goto('/catalog?category=jackets');
       const cards = page.getByTestId('product-card');
       const count = await cards.count();
       expect(count).toBeGreaterThan(0);
       // Все видимые карточки — категории jackets
       for (let i = 0; i < count; i++) {
         await expect(cards.nth(i)).toHaveAttribute('data-category', 'jackets');
       }
     });

     test('blog shows exactly 6 posts', async ({ page }) => {
       await page.goto('/blog');
       const cards = page.getByTestId('blog-card');
       expect(await cards.count()).toBe(6);
     });

     test('metadata titles are correct', async ({ page }) => {
       await page.goto('/');
       expect(await page.title()).toMatch(/Tanar/);
       await page.goto('/catalog');
       expect(await page.title()).toBe('Каталог — Tanar');
       await page.goto('/blog');
       expect(await page.title()).toBe('Журнал — Tanar');
       await page.goto(`/catalog/${PRODUCT_SLUG}`);
       expect(await page.title()).toMatch(/Tanar$/);
       await page.goto(`/blog/${POST_SLUG}`);
       expect(await page.title()).toMatch(/Tanar$/);
     });

     test('navigation from home works', async ({ page }) => {
       await page.goto('/');
       await page.getByRole('link', { name: /смотреть каталог/i }).click();
       await expect(page).toHaveURL('/catalog');
     });
   });
   ```

2. **Scope-ограничение для починки** (критично для Ralph loop):

   Ralph не помнит прошлые итерации, поэтому счётчик попыток живёт **в progress.md**. Перед началом работы в step_11:

   ```bash
   # Посчитать сколько FAIL-записей уже есть по step_11 в progress.md
   FAIL_COUNT=$(grep -c "^### Iteration .* Step 11 .* FAIL" task_tracker/todo/initial-build/progress.md || echo 0)
   echo "Previous step_11 failed attempts: $FAIL_COUNT"
   ```

   Правила:
   - Если `FAIL_COUNT >= 2` — **немедленно** вывести `<promise>BLOCKED</promise>` и записать в progress.md запись "Iteration N — Step 11 — BLOCKED (2 previous attempts failed, asking human)". Не пытаться третий раз.
   - Если `FAIL_COUNT < 2` и smoke-тест упал — сделать ОДИН конкретный фикс, закоммитить, прогнать тесты.
   - Если после фикса упали **3+ разных тестов одновременно** — не продолжать починку, вывести `<promise>BLOCKED</promise>`.

   Запись в progress.md при BLOCKED:
   ```markdown
   ### Iteration [N] — Step 11 — BLOCKED
   - Предыдущие попытки: [FAIL_COUNT]
   - Упало: список тестов
   - Что пробовал: ...
   - Догадка о причине: ...
   ```

   **Не пытаться починить всё подряд** — это первый источник бесконечных петель в Ralph loop.

3. **Порядок починки (если надо)**:
   - Сначала запустить один конкретный упавший тест: `npx playwright test e2e/smoke.spec.ts -g "no errors on /catalog"`
   - Посмотреть ошибку
   - Сделать ОДНО изменение
   - Прогнать тот же тест заново
   - Если прошёл — прогнать полный `npm run test:e2e`
   - Если упал другой тест — это 2-я попытка (см. лимит выше)

4. **Финальный прогон всего**:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   npm run test:e2e
   ```

5. **Коммит**:
   ```bash
   git add -A
   git commit -m "test: add full smoke verification suite"
   ```

   Если в процессе были фиксы — они коммитятся вместе. Не отдельными коммитами, чтобы не засорять historie.

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Файлы:

```bash
test -f e2e/smoke.spec.ts

# Минимум 6 E2E spec-файлов (layout, home, catalog, product, blog-list, blog-post, smoke; responsive добавился в step_10)
test $(find e2e -maxdepth 1 -name "*.spec.ts" | wc -l) -ge 6

# В smoke spec используются именно зафиксированные slug'и
grep -q "shell-jacket-khan" e2e/smoke.spec.ts
grep -q "khan-tengri-ascent" e2e/smoke.spec.ts
```

## Критерии готовности

- [ ] `e2e/smoke.spec.ts` создан, использует `shell-jacket-khan` и `khan-tengri-ascent`
- [ ] Все 5 URL возвращают 200 без ошибок
- [ ] `/catalog` показывает ≥20 product-card
- [ ] Фильтр `?category=jackets` корректно фильтрует
- [ ] `/blog` показывает ровно 6 blog-card
- [ ] Metadata titles корректны на всех типах страниц
- [ ] Навигация из главной в каталог работает
- [ ] Все существующие spec-ы (layout, home, catalog, product, blog-*, responsive) всё ещё проходят
- [ ] Build, typecheck, lint — зелёные
- [ ] Коммит (фиксы + spec вместе)
