import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';

// Storefront-completion features: slug auto-gen, status visibility, specs
// editor round-trip, storefront fields (sizes/badge). Reuses the .env.local
// admin password (never hardcoded).
const PASSWORD = process.env.ADMIN_PASSWORD;

// name "Тестовая Куртка X1" -> canonical translit table (src/lib/slugify) ->
const SLUG = 'testovaya-kurtka-x1';
const SLUG_DUP = 'testovaya-kurtka-x1-2';

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Пароль').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
}

// Fills the create form's required fields (name → auto-slug, one color, one size).
async function fillNewProduct(page: Page, name: string) {
  await page.goto('/admin/catalog/new');
  await page.locator('#name').fill(name);
  const variantBlock = page.locator('section div.rounded-md.border').first();
  const textInputs = variantBlock.locator('input[type="text"], input:not([type])');
  await textInputs.nth(0).fill('green'); // colorId
  await textInputs.nth(1).fill('Зелёный'); // colorLabel
  await variantBlock.locator('table tbody tr').first().locator('input').first().fill('M');
}

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env.local)');
  }
});

// Restore the real catalog regardless of how the run ends. No photos uploaded
// here, so only the DB needs resetting.
test.afterAll(() => {
  execSync('npm run db:seed', { stdio: 'ignore' });
});

test.describe.serial('storefront completion', () => {
  test('slug auto-generates from name (read-only)', async ({ page }) => {
    await login(page);
    await fillNewProduct(page, 'Тестовая Куртка X1');

    const slug = page.locator('#slug');
    await expect(slug).toHaveValue(SLUG);
    await expect(slug).toHaveAttribute('readonly', '');

    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${SLUG}/edit$`));
  });

  test('duplicate name -> slug auto-increments', async ({ page }) => {
    // The first product still exists (created above, not yet archived/deleted),
    // so its slug is taken → this one becomes ...-2.
    await login(page);
    await fillNewProduct(page, 'Тестовая Куртка X1');
    await expect(page.locator('#slug')).toHaveValue(SLUG); // base, pre-uniquify
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${SLUG_DUP}/edit$`));

    // Clean up the duplicate so it doesn't interfere with the rest of the flow.
    await page.getByRole('button', { name: 'Удалить товар' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить товар' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
  });

  test('specs editor round-trips through the DB', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);

    await page.getByRole('button', { name: '+ Характеристика' }).click();
    await page.locator('input[placeholder="Материал"]').fill('Материал');
    await page.locator('input[placeholder="GORE-TEX 3L"]').fill('Нейлон');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);

    // Reopen edit — the saved spec is rehydrated into the inputs.
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await expect(page.locator('input[placeholder="Материал"]')).toHaveValue('Материал');
    await expect(page.locator('input[placeholder="GORE-TEX 3L"]')).toHaveValue('Нейлон');
  });

  test('draft product is hidden from the storefront', async ({ page }) => {
    // Created as draft by default (EMPTY_INPUT.status). Not yet published.
    const res = await page.goto(`/catalog/${SLUG}`);
    expect(res?.status()).toBe(404);

    await page.goto('/catalog');
    await expect(
      page.locator(`[data-testid="product-card"][href="/catalog/${SLUG}"]`),
    ).toHaveCount(0);
  });

  test('publish -> visible with sizes and the saved spec', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.locator('#status').selectOption('published');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);

    const res = await page.goto(`/catalog/${SLUG}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText('Размеры')).toBeVisible();
    await expect(page.getByText('M', { exact: true })).toBeVisible(); // size chip
    await expect(page.getByText('Материал')).toBeVisible(); // spec from earlier
    await expect(page.getByText('Нейлон')).toBeVisible();
  });

  test('archived product is hidden again', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.locator('#status').selectOption('archived');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);

    const res = await page.goto(`/catalog/${SLUG}`);
    expect(res?.status()).toBe(404);
  });

  test('real product shows badge and sizes on storefront', async ({ page }) => {
    await page.goto('/catalog/jacket-sv7-goretex');
    await expect(page.getByText('GORE-TEX®')).toBeVisible();
    await expect(page.getByText('Размеры')).toBeVisible();
  });
});
