import { test, expect, type Page } from '@playwright/test';

// Admin «Заказы»: an order placed on the storefront shows up in the list and
// its status survives a manual change + reload. Reuses the .env.local admin
// password (never hardcoded).
const PASSWORD = process.env.ADMIN_PASSWORD;
const PRODUCT_URL = '/catalog/jacket-sv7-goretex';

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

test.describe.serial('admin orders', () => {
  let orderNumber: string;

  function rowFor(page: Page, number: string) {
    return page
      .getByTestId('order-row')
      .filter({
        has: page.locator('td').first().filter({ hasText: new RegExp(`^${number}$`) }),
      });
  }

  test('guard: /admin/orders without cookie redirects to login', async ({
    page,
  }) => {
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('storefront order appears with number, items and «Новый» status', async ({
    page,
  }) => {
    // Place an order through the real storefront flow (step 6 UI).
    await page.goto(PRODUCT_URL);
    await page.getByTestId('size-option').first().click();
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('checkout-button').click();
    const done = page.getByTestId('checkout-done');
    await expect(done).toBeVisible();
    orderNumber = /№(\d+)/.exec(await done.locator('p').first().innerText())![1];

    await login(page);
    await page.goto('/admin/orders');
    const row = rowFor(page, orderNumber);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Куртка'); // item name snapshot from the DB
    await expect(row).toContainText('шт');
    await expect(row.getByTestId('order-status')).toHaveValue('pending');
  });

  test('status change to «Подтверждён» survives a reload', async ({ page }) => {
    await login(page);
    await page.goto('/admin/orders');
    const select = rowFor(page, orderNumber).getByTestId('order-status');
    await select.selectOption('confirmed');
    // The select is disabled while the server action is in flight.
    await expect(select).toBeEnabled();

    await page.reload();
    await expect(rowFor(page, orderNumber).getByTestId('order-status')).toHaveValue(
      'confirmed',
    );
  });
});
