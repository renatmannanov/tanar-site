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
    // Adding opened the drawer over the page — close it before the second add.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cart-drawer')).toHaveCount(0);
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

test.describe('cart drawer', () => {
  /** Add the first size of the test product; leaves the drawer open. */
  async function addItem(page: Page) {
    await page.goto(PRODUCT_URL);
    await page.getByTestId('size-option').first().click();
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
  }

  /** «12 345 ₸» with whatever space ICU picked — compare digits only. */
  function digits(text: string): string {
    return text.replace(/\D/g, '');
  }

  test('opens via cart button; closes via Escape and backdrop', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('cart-button').click();
    const drawer = page.getByTestId('cart-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByText('Корзина пуста')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    await page.getByTestId('cart-button').click();
    await expect(drawer).toBeVisible();
    await page.getByTestId('cart-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(drawer).toHaveCount(0);
  });

  test('focus lands on the close button when opened', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cart-button').click();
    await expect(
      page.getByRole('button', { name: 'Закрыть корзину' }),
    ).toBeFocused();
  });

  test('qty ± recalculates the total; minus at 1 removes the item', async ({
    page,
  }) => {
    await addItem(page);
    const item = page.getByTestId('cart-item');
    await expect(item).toHaveCount(1);

    const cart = await readCart(page);
    const price = (cart!.items[0] as { price?: number }).price!;
    await expect(page.getByTestId('cart-total')).toContainText('₸');
    expect(digits(await page.getByTestId('cart-total').innerText())).toBe(
      String(price),
    );

    await page.getByRole('button', { name: 'Увеличить' }).click();
    expect(digits(await page.getByTestId('cart-total').innerText())).toBe(
      String(price * 2),
    );

    await page.getByRole('button', { name: 'Уменьшить' }).click();
    expect(digits(await page.getByTestId('cart-total').innerText())).toBe(
      String(price),
    );

    // qty=1 → minus removes the position entirely.
    await page.getByRole('button', { name: 'Уменьшить' }).click();
    await expect(item).toHaveCount(0);
    await expect(page.getByText('Корзина пуста')).toBeVisible();
  });

  test('cart survives a page reload (localStorage)', async ({ page }) => {
    await addItem(page);
    await page.reload();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await page.getByTestId('cart-button').click();
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
  });

  test('clear cart needs a confirm click and empties everything', async ({
    page,
  }) => {
    await addItem(page);
    const clearButton = page.getByTestId('clear-cart');
    await clearButton.click();
    await expect(clearButton).toHaveText('Точно очистить?');
    // Still intact after the first click.
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    await clearButton.click();

    await expect(page.getByText('Корзина пуста')).toBeVisible();
    await expect(page.getByTestId('cart-count')).toHaveCount(0);
  });

  test('drawer is usable on a 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await addItem(page);
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await expect(page.getByTestId('cart-total')).toBeVisible();
    await expect(page.getByTestId('checkout-button')).toBeVisible();
  });
});

test.describe('checkout', () => {
  async function addItem(page: Page) {
    await page.goto(PRODUCT_URL);
    await page.getByTestId('size-option').first().click();
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
  }

  async function orderNumber(page: Page): Promise<number> {
    const text = await page
      .getByTestId('checkout-done')
      .locator('p')
      .first()
      .innerText();
    return Number(/№(\d+)/.exec(text)![1]);
  }

  function decodedWaText(href: string): string {
    return decodeURIComponent(href.split('?text=')[1]);
  }

  test('placing an order shows №N and a valid wa.me link', async ({ page }) => {
    await addItem(page);
    await page.getByTestId('checkout-button').click();

    const done = page.getByTestId('checkout-done');
    await expect(done).toBeVisible();
    await expect(done).toContainText('Заказ №');

    const href = (await page.getByTestId('wa-link').getAttribute('href'))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const text = decodedWaText(href);
    expect(text).toContain('Куртка'); // product name from the DB snapshot
    expect(text).toContain('шт ×');
    expect(text).toContain('Итого');
    expect(text).toContain('Алматы');
  });

  test('unchanged cart re-checkout reuses the same order number', async ({
    page,
  }) => {
    await addItem(page);
    await page.getByTestId('checkout-button').click();
    await expect(page.getByTestId('checkout-done')).toBeVisible();
    const first = await orderNumber(page);

    await page.getByRole('button', { name: '← Назад к корзине' }).click();
    // Cart was NOT cleared by checkout.
    await expect(page.getByTestId('cart-item')).toHaveCount(1);

    await page.getByTestId('checkout-button').click();
    await expect(page.getByTestId('checkout-done')).toBeVisible();
    expect(await orderNumber(page)).toBe(first);
  });

  test('changed cart creates a new order with a new number', async ({
    page,
  }) => {
    await addItem(page);
    await page.getByTestId('checkout-button').click();
    await expect(page.getByTestId('checkout-done')).toBeVisible();
    const first = await orderNumber(page);

    await page.getByRole('button', { name: '← Назад к корзине' }).click();
    await page.getByRole('button', { name: 'Увеличить' }).click();
    await page.getByTestId('checkout-button').click();
    await expect(page.getByTestId('checkout-done')).toBeVisible();
    expect(await orderNumber(page)).not.toBe(first);
  });

  test('QR is visible on desktop and hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await addItem(page);
    await page.getByTestId('checkout-button').click();

    const qr = page.getByTestId('wa-qr');
    await expect(qr).toBeVisible();
    // toDataURL is async — auto-waiting assertion, not an instant check.
    await expect(qr.locator('img')).toHaveAttribute('src', /^data:image\//);

    await page.setViewportSize({ width: 375, height: 740 });
    await expect(qr).toBeHidden();
  });

  test('copy button copies the order text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await addItem(page);
    await page.getByTestId('checkout-button').click();
    await expect(page.getByTestId('checkout-done')).toBeVisible();

    await page
      .getByRole('button', { name: 'Скопировать текст заказа' })
      .click();
    await expect(page.getByText('Скопировано ✓')).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('Заказ №');
    expect(clip).toContain('Итого');
  });

  test('prices come from the DB, not the client cart', async ({ page }) => {
    await addItem(page);
    const cart = await readCart(page);
    const realPrice = (cart!.items[0] as { price?: number }).price!;

    // Tamper with the client-side snapshot price.
    await page.evaluate((key) => {
      const stored = JSON.parse(window.localStorage.getItem(key)!);
      stored.items[0].price = 1;
      window.localStorage.setItem(key, JSON.stringify(stored));
    }, CART_KEY);
    await page.reload();
    await page.getByTestId('cart-button').click();
    await page.getByTestId('checkout-button').click();

    const href = (await page.getByTestId('wa-link').getAttribute('href'))!;
    const totalLine = decodedWaText(href)
      .split('\n')
      .find((l) => l.startsWith('Итого'))!;
    expect(totalLine.replace(/\D/g, '')).toBe(String(realPrice));
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
