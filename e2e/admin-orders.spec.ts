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

function rowFor(page: Page, number: string) {
  return page
    .getByTestId('order-row')
    .filter({
      has: page.locator('td').first().filter({ hasText: new RegExp(`^${number}$`) }),
    });
}

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env.local)');
  }
});

test.describe.serial('admin orders', () => {
  let orderNumber: string;

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

    // The sidebar badge counts pending orders — at least this fresh one.
    const badge = page.getByTestId('pending-orders-badge');
    await expect(badge).toBeVisible();
    expect(Number(await badge.innerText())).toBeGreaterThanOrEqual(1);
  });

  test('status change to «Подтверждён» survives a reload and tints the row', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/orders');
    const select = rowFor(page, orderNumber).getByTestId('order-status');
    await select.selectOption('confirmed');
    // The select is disabled while the server action is in flight.
    await expect(select).toBeEnabled();

    await page.reload();
    const row = rowFor(page, orderNumber);
    await expect(row.getByTestId('order-status')).toHaveValue('confirmed');
    // Status drives the muted row tint (data-status + bg class).
    await expect(row).toHaveAttribute('data-status', 'confirmed');
    await expect(row).toHaveClass(/bg-sky-300\/30/);
  });

  test('delete asks for confirmation and removes the order', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/orders');
    const row = rowFor(page, orderNumber);
    await expect(row).toHaveCount(1);

    await row.getByTestId('delete-order').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(`Удалить заказ №${orderNumber}?`);

    // Cancelling keeps the order.
    await dialog.getByRole('button', { name: 'Отмена' }).click();
    await expect(row).toHaveCount(1);

    // Confirming deletes it — and it stays gone after a reload.
    await row.getByTestId('delete-order').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(rowFor(page, orderNumber)).toHaveCount(0);
  });
});

// Step 3 (cart-inventory): confirming an order with insufficient stock must
// roll the select back and show a per-position error. Self-sufficient: creates
// its own product (1 color, size M, stock=1); cleanup deletes the order BEFORE
// the product (order_items.skuId FK has no cascade).
test.describe.serial('insufficient stock blocks confirmation', () => {
  const NAME = 'Тестовый Сток X1';
  const SLUG = 'testovyy-stok-x1'; // canonical translit (src/lib/slugify)
  let orderNumber: string;

  /** Sets the single SKU's stock via the admin product form (Остаток column). */
  async function setStock(page: Page, qty: number) {
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page
      .locator('section div.rounded-md.border')
      .first()
      .locator('table tbody tr')
      .first()
      .locator('input[type="number"]')
      .fill(String(qty));
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    await page.goto('/admin/catalog/new');
    await page.locator('#name').fill(NAME);
    const variantBlock = page.locator('section div.rounded-md.border').first();
    const textInputs = variantBlock.locator('input[type="text"], input:not([type])');
    await textInputs.nth(0).fill('green'); // colorId
    await textInputs.nth(1).fill('Зелёный'); // colorLabel
    const skuRow = variantBlock.locator('table tbody tr').first();
    await skuRow.locator('input').first().fill('M');
    await skuRow.locator('input[type="number"]').fill('1');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${SLUG}/edit$`));
    await page.locator('#status').selectOption('published');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    // Order first (FK), then the product. The order is confirmed by the last
    // test — the delete dialog must warn about the reserve.
    await page.goto('/admin/orders');
    const row = rowFor(page, orderNumber);
    if ((await row.count()) > 0) {
      await row.getByTestId('delete-order').click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Резерв будет снят');
      await dialog.getByRole('button', { name: 'Удалить' }).click();
      await expect(row).toHaveCount(0);
    }
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByRole('button', { name: 'Удалить товар' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Удалить товар' })
      .click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await page.close();
  });

  test('place an order for the single in-stock unit', async ({ page }) => {
    await page.goto(`/catalog/${SLUG}`);
    // Single-size color → the size is auto-selected, the CTA is armed.
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('checkout-button').click();
    const done = page.getByTestId('checkout-done');
    await expect(done).toBeVisible();
    orderNumber = /№(\d+)/.exec(await done.locator('p').first().innerText())![1];
    // The order stays «Новый» (pending) — reused by the next two tests.
  });

  test('confirming with zero stock rolls the select back with an error', async ({
    page,
  }) => {
    await login(page);
    await setStock(page, 0);
    await page.goto('/admin/orders');
    const row = rowFor(page, orderNumber);
    const select = row.getByTestId('order-status');
    await select.selectOption('confirmed');

    const error = row.getByTestId('status-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Не хватает остатка');
    await expect(error).toContainText('нужно 1, доступно 0');
    await expect(select).toHaveValue('pending'); // rolled back

    // Nothing was written — the status survives a reload as «Новый».
    await page.reload();
    await expect(rowFor(page, orderNumber).getByTestId('order-status')).toHaveValue(
      'pending',
    );
  });

  test('confirmation passes after restock', async ({ page }) => {
    await login(page);
    await setStock(page, 1);
    await page.goto('/admin/orders');
    const row = rowFor(page, orderNumber);
    const select = row.getByTestId('order-status');
    await select.selectOption('confirmed');
    await expect(select).toBeEnabled();
    await expect(select).toHaveValue('confirmed');
    await expect(row.getByTestId('status-error')).toHaveCount(0);

    await page.reload();
    await expect(rowFor(page, orderNumber).getByTestId('order-status')).toHaveValue(
      'confirmed',
    );
  });
});
