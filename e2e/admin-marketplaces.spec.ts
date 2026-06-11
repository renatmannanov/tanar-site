import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';

// Kaspi/Ozon links in the admin product form, verified through to the
// storefront card (MarketplaceLinks + the geography line from step 4).
// Reuses the .env.local admin password (never hardcoded).
const PASSWORD = process.env.ADMIN_PASSWORD;

const SLUG = 'jacket-sv7-goretex';
const KASPI_URL = 'https://kaspi.kz/shop/p/test-123';
const OZON_URL = 'https://www.ozon.ru/product/test-456';
const SKU_KASPI_URL = 'https://kaspi.kz/shop/p/sku-test-001';
const PRODUCT_KASPI_URL = 'https://kaspi.kz/shop/p/product-level';
const SKU_M_KASPI_URL = 'https://kaspi.kz/shop/p/sku-m-001';

/** Kaspi/Ozon input of the per-SKU links table row holding the given article. */
function skuRowInput(page: Page, article: string, key: 'kaspi' | 'ozon') {
  return page
    .locator('tr')
    .filter({ hasText: article })
    .getByTestId(`sku-mp-${key}`);
}

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
  test('filling Kaspi link shows the button and the marketplace hint', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await page.getByTestId('mp-kaspi').fill(KASPI_URL);
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    const kaspi = page.getByRole('link', { name: 'Kaspi', exact: true });
    await expect(kaspi).toHaveAttribute('href', KASPI_URL);
    // The marketplace block carries its own explainer caption.
    await expect(
      page.getByText(/перейдите по ссылкам на маркетплейсы/),
    ).toBeVisible();
  });

  test('clearing the Kaspi link removes the button', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await expect(page.getByTestId('mp-kaspi')).toHaveValue(KASPI_URL);
    await page.getByTestId('mp-kaspi').fill('');
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    await expect(
      page.getByRole('link', { name: 'Kaspi', exact: true }),
    ).toHaveCount(0);
  });

  test('filling Ozon link shows the Ozon button', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await page.getByTestId('mp-ozon').fill(OZON_URL);
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    const ozon = page.getByRole('link', { name: 'Ozon', exact: true });
    await expect(ozon).toHaveAttribute('href', OZON_URL);
  });
});

// Per-SKU links: the «Маркетплейсы» tab in the admin form. afterAll's db:seed
// restores the canonical catalog after the edits below.
test.describe.serial('per-sku links', () => {
  test('tabs switch panels and keep the entered value', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);

    // Default tab is «Товар»: product fields visible, sku links hidden.
    await expect(page.locator('#name')).toBeVisible();
    await expect(skuRowInput(page, 'TANAR-001', 'ozon')).toBeHidden();

    await page.getByTestId('tab-marketplaces').click();
    await expect(skuRowInput(page, 'TANAR-001', 'ozon')).toBeVisible();
    await expect(page.locator('#name')).toBeHidden();

    // State survives a round-trip through the other tab (panels are hidden,
    // not unmounted).
    await skuRowInput(page, 'TANAR-001', 'ozon').fill('https://ozon.kz/product/tab-roundtrip');
    await page.getByTestId('tab-product').click();
    await page.getByTestId('tab-marketplaces').click();
    await expect(skuRowInput(page, 'TANAR-001', 'ozon')).toHaveValue(
      'https://ozon.kz/product/tab-roundtrip',
    );
  });

  test('saving writes sku links; reopen shows them', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await skuRowInput(page, 'TANAR-001', 'kaspi').fill(SKU_KASPI_URL);
    await saveProduct(page);

    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await expect(skuRowInput(page, 'TANAR-001', 'kaspi')).toHaveValue(SKU_KASPI_URL);
  });

  test('saving from the product tab does not wipe sku links (regression)', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    // Touch only the product tab — the mapper must still pass sku.marketplaces
    // through, or upsertSkus' full replace would silently erase the links.
    await page.locator('#description').fill('Описание после регрессионного сохранения.');
    await saveProduct(page);

    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await expect(skuRowInput(page, 'TANAR-001', 'kaspi')).toHaveValue(SKU_KASPI_URL);
  });

  test('storefront buttons follow the picked size (sku link, fallback, reset)', async ({
    page,
  }) => {
    // Arrange via the admin: product-level Kaspi set, Ozon cleared everywhere;
    // Чёрный M (TANAR-001) gets its own Kaspi link, Чёрный L (TANAR-002) none.
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await page.getByTestId('mp-kaspi').fill(PRODUCT_KASPI_URL);
    await page.getByTestId('mp-ozon').fill('');
    await skuRowInput(page, 'TANAR-001', 'kaspi').fill(SKU_M_KASPI_URL);
    await skuRowInput(page, 'TANAR-001', 'ozon').fill('');
    await skuRowInput(page, 'TANAR-002', 'kaspi').fill('');
    await skuRowInput(page, 'TANAR-002', 'ozon').fill('');
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    const black = page.getByRole('button', { name: 'Чёрный', exact: true });
    await black.click();
    await expect(black).toHaveAttribute('aria-pressed', 'true');

    const kaspi = page.getByRole('link', { name: 'Kaspi', exact: true });
    const ozon = page.getByRole('link', { name: 'Ozon', exact: true });
    const sizeM = page.getByTestId('size-option').filter({ hasText: /^M \// });
    const sizeL = page.getByTestId('size-option').filter({ hasText: /^L \// });

    // No size picked → product-level fallback; Ozon has no link anywhere.
    await expect(kaspi).toHaveAttribute('href', PRODUCT_KASPI_URL);
    await expect(ozon).toHaveCount(0);

    // M has its own link → href swaps to the SKU card.
    await sizeM.click();
    await expect(kaspi).toHaveAttribute('href', SKU_M_KASPI_URL);

    // L has none → per-key fallback to the product link.
    await sizeL.click();
    await expect(kaspi).toHaveAttribute('href', PRODUCT_KASPI_URL);

    // Back to M → the sku link again (state does not stick).
    await sizeM.click();
    await expect(kaspi).toHaveAttribute('href', SKU_M_KASPI_URL);
    await expect(ozon).toHaveCount(0);
  });

  test('buttons are greyed before a size is picked when only sku links exist', async ({
    page,
  }) => {
    // Clear the product-level Kaspi fallback; TANAR-001 (Чёрный M) keeps its
    // sku link from the previous test.
    await login(page);
    await page.goto(`/admin/catalog/${SLUG}/edit`);
    await page.getByTestId('tab-marketplaces').click();
    await page.getByTestId('mp-kaspi').fill('');
    await saveProduct(page);

    await page.goto(`/catalog/${SLUG}`);
    const black = page.getByRole('button', { name: 'Чёрный', exact: true });
    await black.click();
    await expect(black).toHaveAttribute('aria-pressed', 'true');

    const kaspiLink = page.getByRole('link', { name: 'Kaspi', exact: true });
    const sizeM = page.getByTestId('size-option').filter({ hasText: /^M \// });
    const sizeL = page.getByTestId('size-option').filter({ hasText: /^L \// });

    // No size picked → the block is visible but the buttons are inactive.
    await expect(page.getByTestId('mp-disabled-kaspi')).toBeVisible();
    await expect(kaspiLink).toHaveCount(0);

    // Picking the size with a link activates the button…
    await sizeM.click();
    await expect(kaspiLink).toHaveAttribute('href', SKU_M_KASPI_URL);
    await expect(page.getByTestId('mp-disabled-kaspi')).toHaveCount(0);

    // …and a size without one greys it back.
    await sizeL.click();
    await expect(page.getByTestId('mp-disabled-kaspi')).toBeVisible();
    await expect(kaspiLink).toHaveCount(0);
  });
});
