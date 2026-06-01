import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

// Full CRUD + photo management. Reuses the same .env.local admin password the
// dev server reads (never hardcode the secret).
const PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_SLUG = 'e2e-test-product';
const FIXTURE = path.join(process.cwd(), 'e2e', 'fixtures', 'sample.png');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'images', 'products', TEST_SLUG);

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

// Restore the real catalog and remove uploaded test files, regardless of how
// the run ends — keeps the DB and disk clean for the next run.
test.afterAll(() => {
  execSync('npm run db:seed', { stdio: 'ignore' });
  try {
    rmSync(UPLOAD_DIR, { recursive: true, force: true });
  } catch {
    /* nothing uploaded */
  }
});

// One serial flow: create -> upload -> reorder -> remove -> storefront -> delete.
test.describe.serial('product CRUD + variant photos', () => {
  test('create a product and land on its edit page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/catalog/new');

    // #slug is read-only — auto-generated from #name. slugify('E2E Test Product')
    // === 'e2e-test-product' === TEST_SLUG, so the URL assertion below still holds.
    await page.locator('#name').fill('E2E Test Product');
    await page.locator('#priceBase').fill('12345');
    await page.locator('#description').fill('E2E description.');

    // First (only) variant block. Text inputs in order: colorId, colorLabel.
    const variantBlock = page.locator('section div.rounded-md.border').first();
    const textInputs = variantBlock.locator('input[type="text"], input:not([type])');
    await textInputs.nth(0).fill('green'); // colorId
    await textInputs.nth(1).fill('Зелёный'); // colorLabel
    // First sku row, first cell = size.
    await variantBlock.locator('table tbody tr').first().locator('input').first().fill('M');

    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${TEST_SLUG}/edit$`));
  });

  test('upload a photo — preview + "Главное" badge', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FIXTURE);

    // The uploaded image preview appears, with the "Главное" badge on the first.
    const previews = page.locator('ul li img');
    await expect(previews.first()).toBeVisible();
    await expect(page.getByText('Главное')).toBeVisible();
  });

  test('upload a second photo and reorder', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FIXTURE);

    const previews = page.locator('ul li');
    await expect(previews).toHaveCount(2);

    // Capture the first image's src, move the 2nd left, expect the order to swap.
    const firstSrcBefore = await previews.first().locator('img').getAttribute('src');
    // Hover the second to reveal controls, click its "←".
    await previews.nth(1).hover();
    await previews.nth(1).getByRole('button', { name: 'Левее' }).click();

    await expect(async () => {
      const firstSrcAfter = await page
        .locator('ul li')
        .first()
        .locator('img')
        .getAttribute('src');
      expect(firstSrcAfter).not.toBe(firstSrcBefore);
    }).toPass();
  });

  test('remove a photo via confirm', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    const previews = page.locator('ul li');
    await expect(previews).toHaveCount(2);

    await previews.first().hover();
    await previews.first().getByRole('button', { name: '×' }).click();
    await page.getByRole('button', { name: 'Удалить фото' }).click();

    await expect(page.locator('ul li')).toHaveCount(1);
  });

  test('storefront shows the uploaded image (not a gradient)', async ({ page }) => {
    await page.goto(`/catalog/${TEST_SLUG}`);
    const galleryImg = page.locator('img[src*="/images/products/' + TEST_SLUG + '/"]').first();
    await expect(galleryImg).toBeVisible();
  });

  test('delete the product -> 404 on storefront', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    await page.getByRole('button', { name: 'Удалить товар' }).click();
    // Confirm inside the Radix dialog (scoped, not the trigger button).
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Удалить товар' })
      .click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);

    const res = await page.goto(`/catalog/${TEST_SLUG}`);
    expect(res?.status()).toBe(404);
  });
});
