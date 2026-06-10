import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';

// Kaspi/Ozon links in the admin product form, verified through to the
// storefront card (MarketplaceLinks + the geography line from step 4).
// Reuses the .env.local admin password (never hardcoded).
const PASSWORD = process.env.ADMIN_PASSWORD;

const SLUG = 'jacket-sv7-goretex';
const KASPI_URL = 'https://kaspi.kz/shop/p/test-123';
const OZON_URL = 'https://www.ozon.ru/product/test-456';

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Пароль').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
}

async function saveProduct(page: Page) {
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
}

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env.local)');
  }
});

// Restore the canonical catalog (the tests edit a real seeded product).
test.afterAll(() => {
  execSync('npm run db:seed', { stdio: 'ignore' });
});

test.describe.serial('admin marketplaces', () => {
  test('filling Kaspi link shows the button and geography segment', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('mp-kaspi').fill(KASPI_URL);
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    const kaspi = page.getByRole('link', { name: 'Kaspi', exact: true });
    await expect(kaspi).toHaveAttribute('href', KASPI_URL);
    // Geography line gains the Kaspi segment only when the link is set.
    await expect(
      page.getByText(/Алматы — заказ через корзину · Казахстан — Kaspi/),
    ).toBeVisible();
  });

  test('clearing the Kaspi link removes the button', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await expect(page.getByTestId('mp-kaspi')).toHaveValue(KASPI_URL);
    await page.getByTestId('mp-kaspi').fill('');
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    await expect(
      page.getByRole('link', { name: 'Kaspi', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/Казахстан — Kaspi/)).toHaveCount(0);
  });

  test('filling Ozon link shows the Ozon button', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('mp-ozon').fill(OZON_URL);
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    const ozon = page.getByRole('link', { name: 'Ozon', exact: true });
    await expect(ozon).toHaveAttribute('href', OZON_URL);
    await expect(page.getByText(/другие страны — Ozon/)).toBeVisible();
  });
});
