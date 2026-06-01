import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';

// Admin password comes from the same .env.local the dev server reads. Never
// hardcode the secret in the spec.
const PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_SLUG = 'jacket-sv7-goretex';

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Пароль').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
}

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env.local)');
  }
});

// Safety net: regardless of how the edit test ends, restore the real catalog so
// a mid-test failure never leaves the DB dirty for the next run.
test.afterAll(() => {
  execSync('npm run db:seed', { stdio: 'ignore' });
});

test('guard: /admin/catalog without cookie redirects to login', async ({ page }) => {
  await page.goto('/admin/catalog');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('wrong password keeps us on login with an error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Пароль').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('p[role="alert"]')).toContainText('Неверный пароль');
});

test('correct password logs in and shows the catalog list', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();
  // 12 real products seeded.
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(12);
  // Create link is active and points to the new-product page (Plan C).
  await expect(page.getByRole('link', { name: 'Создать товар' })).toHaveAttribute(
    'href',
    '/admin/catalog/new',
  );
});

test('edit form is prefilled; delete button is active', async ({ page }) => {
  await login(page);
  await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);
  // Prefilled.
  await expect(page.locator('#slug')).toHaveValue(TEST_SLUG);
  await expect(page.locator('#name')).not.toHaveValue('');
  await expect(page.locator('#priceBase')).toHaveValue('80000');
  // Delete button active on edit (Plan C).
  await expect(page.getByRole('button', { name: 'Удалить товар' })).toBeEnabled();
});

test('edit -> save persists, then reverts (idempotent)', async ({ page }) => {
  await login(page);
  await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

  const nameField = page.locator('#name');
  const original = await nameField.inputValue();
  const edited = `${original} [e2e]`;

  // Change and save.
  await nameField.fill(edited);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
  await expect(page.getByRole('link', { name: edited })).toBeVisible();

  // Revert within the same run (afterAll db:seed is the safety net).
  await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);
  await page.locator('#name').fill(original);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
  await expect(page.getByRole('link', { name: original })).toBeVisible();
});

test('logout clears the session', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  // Re-visiting a protected page bounces back to login.
  await page.goto('/admin/catalog');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
