import { test, expect, type Page } from '@playwright/test';

// Step 7 (cart-inventory): the full stock lifecycle through real UI only —
// order → confirm (reserve) → sold out on the storefront → cancel (release) →
// done (write-off) → deletion hygiene. Self-sufficient product («Тестовый
// Цикл X3», 1 color, size M, stock=2); orders are deleted BEFORE the product
// (order_items.skuId FK has no cascade). No SQL asserts — observability is
// the storefront dot/CTA and the drawer cap.
const PASSWORD = process.env.ADMIN_PASSWORD;
const NAME = 'Тестовый Цикл X3';
const SLUG = 'testovyy-cikl-x3'; // canonical translit (src/lib/slugify: Ц → c)
const PRODUCT_URL = `/catalog/${SLUG}`;

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

/** Places an order for the (auto-selected) single size M with the given qty. */
async function placeOrder(page: Page, qty: number): Promise<string> {
  await page.goto(PRODUCT_URL);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  for (let i = 1; i < qty; i++) {
    await page.getByRole('button', { name: 'Увеличить' }).click();
  }
  await page.getByTestId('checkout-button').click();
  const done = page.getByTestId('checkout-done');
  await expect(done).toBeVisible();
  return /№(\d+)/.exec(await done.locator('p').first().innerText())![1];
}

/** Changes an order's status via the admin select, expecting success. */
async function setStatus(page: Page, number: string, status: string) {
  await page.goto('/admin/orders');
  const row = rowFor(page, number);
  const select = row.getByTestId('order-status');
  await select.selectOption(status);
  await expect(select).toBeEnabled();
  await expect(select).toHaveValue(status);
  await expect(row.getByTestId('status-error')).toHaveCount(0);
}

/** Deletes an order via the «×», optionally asserting the dialog's stock note. */
async function deleteOrder(page: Page, number: string, expectNote?: string) {
  await page.goto('/admin/orders');
  const row = rowFor(page, number);
  await row.getByTestId('delete-order').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  if (expectNote) {
    await expect(dialog).toContainText(expectNote);
  }
  await dialog.getByRole('button', { name: 'Удалить' }).click();
  await expect(row).toHaveCount(0);
}

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env.local)');
  }
});

test.describe.serial('inventory lifecycle', () => {
  let order1: string;
  let order2: string;
  let order3: string;

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
    await skuRow.locator('input[type="number"]').fill('2');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${SLUG}/edit$`));
    await page.locator('#status').selectOption('published');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // All orders are deleted by the tests themselves — only the product is left.
    const page = await browser.newPage();
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByRole('button', { name: 'Удалить товар' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Удалить товар' })
      .click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await page.close();
  });

  test('confirming an order dries the storefront up (reserve = stock)', async ({
    page,
  }) => {
    order1 = await placeOrder(page, 2); // the whole stock
    await login(page);
    await setStatus(page, order1, 'confirmed');

    await page.goto(PRODUCT_URL);
    // available 2-2=0 → the auto-selected single size is sold out.
    await expect(page.getByTestId('size-option')).toHaveAttribute(
      'data-soldout',
      'true',
    );
    await expect(page.getByTestId('ask-restock')).toBeVisible();
    await expect(page.getByTestId('stock-indicator')).toHaveCount(0);
  });

  test('sold out: clicking the struck-through size shows ask-restock, not add-to-cart', async ({
    page,
  }) => {
    // Fresh context → the cart is already empty; this is the smoke re-check
    // of the step-4 behaviour inside the lifecycle.
    await page.goto(PRODUCT_URL);
    await page.getByTestId('size-option').click();
    await expect(page.getByTestId('ask-restock')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toHaveCount(0);
  });

  test('cancelling returns availability', async ({ page }) => {
    await login(page);
    await setStatus(page, order1, 'cancelled');

    await page.goto(PRODUCT_URL);
    const indicator = page.getByTestId('stock-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute('data-level', 'low'); // available 2
    await expect(page.getByTestId('size-option')).not.toHaveAttribute(
      'data-soldout',
      'true',
    );
  });

  test('confirm then done writes the stock off', async ({ page }) => {
    order2 = await placeOrder(page, 1);
    await login(page);
    await setStatus(page, order2, 'confirmed');
    await setStatus(page, order2, 'done');

    await page.goto(PRODUCT_URL);
    // done: stock 1, reserved 0 → available 1.
    const indicator = page.getByTestId('stock-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute('data-level', 'low');
  });

  test('done → cancelled → done does not drift the stock', async ({ page }) => {
    // same→same cannot be picked in a select — idempotency stays a property
    // of the code (early return old === new under the row lock). The e2e
    // checks the round trip instead.
    await login(page);
    await setStatus(page, order2, 'cancelled'); // stock back to 2
    await page.goto(PRODUCT_URL);
    await expect(page.getByTestId('stock-indicator')).toBeVisible();

    await setStatus(page, order2, 'done'); // written off again
    await page.goto(PRODUCT_URL);
    await expect(page.getByTestId('stock-indicator')).toBeVisible();
    // available is exactly 1 again: the drawer cap proves it (qty-limit at 1).
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Увеличить' })).toBeDisabled();
    await expect(page.getByTestId('qty-limit')).toBeVisible();
  });

  test('deleting a done order does NOT return the stock', async ({ page }) => {
    await login(page);
    await deleteOrder(page, order2, 'Списанный остаток на склад не вернётся');

    await page.goto(PRODUCT_URL);
    // The write-off survived: still available 1, not 2.
    const indicator = page.getByTestId('stock-indicator');
    await expect(indicator).toHaveAttribute('data-level', 'low');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Увеличить' })).toBeDisabled();

    // The cancelled order carries no stock effect — plain delete (we are
    // still logged in from the start of this test).
    await deleteOrder(page, order1);
  });

  test('deleting a confirmed order releases the reserve', async ({ page }) => {
    order3 = await placeOrder(page, 1); // the last unit
    await login(page);
    await setStatus(page, order3, 'confirmed');

    await page.goto(PRODUCT_URL);
    await expect(page.getByTestId('size-option')).toHaveAttribute(
      'data-soldout',
      'true',
    );

    await deleteOrder(page, order3, 'Резерв будет снят');
    await page.goto(PRODUCT_URL);
    const indicator = page.getByTestId('stock-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute('data-level', 'low'); // available 1 again
  });
});
