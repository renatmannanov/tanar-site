import { test, expect, type Page } from '@playwright/test';

// Cart behaviour on the product page (step 4) and the drawer (step 5).
// Each test gets a fresh browser context → empty localStorage, no cross-test
// cart bleed. Reuses the .env.local admin password (never hardcoded).
const PASSWORD = process.env.ADMIN_PASSWORD;

// jacket-sv7-goretex: 5 colors × 3 sizes — multi-size AND multi-color.
const PRODUCT_URL = '/catalog/jacket-sv7-goretex';
const CART_KEY = 'tanar-cart';

type StoredCart = { v: 1; items: { skuId: string; size: string; qty: number }[] };

async function readCart(page: Page): Promise<StoredCart | null> {
  const raw = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    CART_KEY,
  );
  return raw ? (JSON.parse(raw) as StoredCart) : null;
}

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

test.describe('add to cart', () => {
  test('size must be picked first; adding writes localStorage and badge', async ({
    page,
  }) => {
    await page.goto(PRODUCT_URL);

    const addButton = page.getByTestId('add-to-cart');
    await expect(addButton).toBeDisabled();
    await expect(addButton).toHaveText('Выберите размер');

    const sizeOptions = page.getByTestId('size-option');
    expect(await sizeOptions.count()).toBeGreaterThanOrEqual(2);

    const firstSize = sizeOptions.first();
    const sizeText = (await firstSize.innerText()).split('/')[0].trim();
    await firstSize.click();
    await expect(firstSize).toHaveAttribute('aria-pressed', 'true');

    await expect(addButton).toBeEnabled();
    await expect(addButton).toHaveText('В корзину');
    await addButton.click();

    await expect(page.getByTestId('cart-count')).toHaveText('1');
    const cart = await readCart(page);
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].qty).toBe(1);
    expect(cart?.items[0].size).toBe(sizeText);
    expect(cart?.items[0].skuId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('re-adding the same SKU increments qty, does not duplicate', async ({
    page,
  }) => {
    await page.goto(PRODUCT_URL);
    await page.getByTestId('size-option').first().click();
    const addButton = page.getByTestId('add-to-cart');
    await addButton.click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await addButton.click();

    await expect(page.getByTestId('cart-count')).toHaveText('2');
    const cart = await readCart(page);
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].qty).toBe(2);
  });

  test('switching color resets the picked size', async ({ page }) => {
    await page.goto(PRODUCT_URL);
    await page.getByTestId('size-option').first().click();
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();

    // Color swatches are the round aria-pressed buttons (sizes are rect chips).
    const swatches = page.locator('button.rounded-full[aria-pressed]');
    await swatches.nth(1).click();

    await expect(page.getByTestId('add-to-cart')).toBeDisabled();
    await expect(page.getByTestId('add-to-cart')).toHaveText('Выберите размер');
  });

  test('published product shows the cart/marketplace geography line', async ({
    page,
  }) => {
    await page.goto(PRODUCT_URL);
    await expect(page.getByText(/Алматы — заказ через корзину/)).toBeVisible();
  });
});

// The seed has no coming_soon products (all 12 published), so this block
// creates its own through the admin UI and deletes it afterwards —
// self-sufficient, no dependency on other specs.
test.describe.serial('coming soon product', () => {
  const NAME = 'Тестовая Скоро X9';
  const SLUG = 'testovaya-skoro-x9'; // canonical translit (src/lib/slugify)

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    await page.goto('/admin/catalog/new');
    await page.locator('#name').fill(NAME);
    const variantBlock = page.locator('section div.rounded-md.border').first();
    const textInputs = variantBlock.locator('input[type="text"], input:not([type])');
    await textInputs.nth(0).fill('green'); // colorId
    await textInputs.nth(1).fill('Зелёный'); // colorLabel
    await variantBlock.locator('table tbody tr').first().locator('input').first().fill('M');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${SLUG}/edit$`));
    await page.locator('#status').selectOption('coming_soon');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
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

  test('«Узнать о наличии» is a wa.me link with the product name', async ({
    page,
  }) => {
    await page.goto(`/catalog/${SLUG}`);
    const link = page.getByTestId('ask-availability');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(href).toContain(encodeURIComponent(NAME));
  });
});
