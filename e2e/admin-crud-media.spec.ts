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

/**
 * Upload a photo into a specific empty slot. Each empty slot is a tile with
 * title="Загрузить: <label>"; clicking it opens the (hidden) file picker, so we
 * catch the filechooser and feed it the fixture. The photo lands in the slot's
 * role/view.
 */
async function uploadIntoSlot(page: Page, slotTitle: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTitle(slotTitle).click(),
  ]);
  await chooser.setFiles(FIXTURE);
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

// One serial flow: create -> upload into slots -> generate flat -> remove ->
// storefront -> delete. Photos live in a 6-slot grid (life/flat × front/side/
// back); occupied slots render as `ul li`, so counts below track stored photos.
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

  test('upload a lifestyle photo into the life_front slot', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    await uploadIntoSlot(page, 'Загрузить: Живое · спереди');

    // The occupied slot renders as `ul li` with the slot label badge.
    await expect(page.locator('ul li img')).toHaveCount(1);
    await expect(page.getByText('Живое · спереди')).toBeVisible();
  });

  test('upload a second lifestyle photo into the life_side slot', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    await expect(page.locator('ul li')).toHaveCount(1);
    await uploadIntoSlot(page, 'Загрузить: Живое · сбоку');
    await expect(page.locator('ul li')).toHaveCount(2);
  });

  test('generate a flat photo from a lifestyle source (mocked Gemini)', async ({
    page,
  }) => {
    // Uploaded photos are lifestyle, so the "Сделать на белом" (flat) button is
    // offered. PHOTOGEN_FAKE=1 (playwright.config webServer.env) swaps in a
    // no-op provider — no real Gemini call. The action runs the full upload
    // pipeline, so a 3rd occupied slot appears.
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    await expect(page.locator('ul li')).toHaveCount(2);
    // Empty slots show a "✨ Сгенерировать" button that opens a candidate
    // popover. flat_front's only candidate is recipe 1 from its own life_front.
    // Click the slot's generate button (first one = flat_front), then the
    // "Сделать на белом" row in the popover. PHOTOGEN_FAKE=1 swaps in a no-op
    // provider — no real Gemini call.
    await page
      .getByRole('button', { name: 'Сгенерировать', exact: false })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Сделать на белом', exact: false })
      .first()
      .click();
    await expect(page.locator('ul li')).toHaveCount(3);

    // The generated flat must land in flat_front with view='front' (NOT a
    // back-flat with a logo). The occupied slot shows the "На белом · спереди"
    // label badge.
    await expect(page.getByText('На белом · спереди')).toBeVisible();
  });

  test('remove a photo via confirm', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);

    const previews = page.locator('ul li');
    await expect(previews).toHaveCount(3);

    await previews.first().hover();
    await previews.first().getByRole('button', { name: '×' }).click();
    await page.getByRole('button', { name: 'Удалить фото' }).click();

    await expect(page.locator('ul li')).toHaveCount(2);
  });

  test('storefront shows the uploaded image (not a gradient)', async ({ page }) => {
    // The product is created as draft (hidden from the storefront since the
    // status-visibility change). Publish it first so /catalog/<slug> serves it.
    await login(page);
    await page.goto(`/admin/catalog/${TEST_SLUG}/edit`);
    await page.locator('#status').selectOption('published');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);

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

// Recolor from a sibling color: a flat of color A is the source for color B's
// empty flat_front slot (recipe 2). Separate product so it doesn't entangle the
// main flow. Cleaned up by deleting the product at the end.
const RECOLOR_SLUG = 'e2e-recolor-product';
const RECOLOR_DIR = path.join(
  process.cwd(),
  'public',
  'images',
  'products',
  RECOLOR_SLUG,
);

test.describe.serial('slot-bound recolor from a sibling color', () => {
  test.afterAll(() => {
    try {
      rmSync(RECOLOR_DIR, { recursive: true, force: true });
    } catch {
      /* nothing uploaded */
    }
  });

  test('create a 2-color product', async ({ page }) => {
    await login(page);
    await page.goto('/admin/catalog/new');

    await page.locator('#name').fill('E2E Recolor Product');
    await page.locator('#priceBase').fill('9999');
    await page.locator('#description').fill('E2E recolor description.');

    // Variant blocks are DIRECT children of the "Цвета и размеры" section; the
    // photo block nested inside also has rounded-md/border, so scope with `>`.
    const variantsSection = page.locator('section', { hasText: 'Цвета и размеры' });
    const variantBlocks = variantsSection.locator(':scope > div.rounded-md.border');

    // First color: green.
    const blockA = variantBlocks.first();
    const inputsA = blockA.locator('input[type="text"], input:not([type])');
    await inputsA.nth(0).fill('green');
    await inputsA.nth(1).fill('Зелёный');
    await blockA.locator('table tbody tr').first().locator('input').first().fill('M');

    // Add a second color: blue.
    await page.getByRole('button', { name: '+ Цвет' }).click();
    const blockB = variantBlocks.nth(1);
    const inputsB = blockB.locator('input[type="text"], input:not([type])');
    await inputsB.nth(0).fill('blue');
    await inputsB.nth(1).fill('Синий');
    await blockB.locator('table tbody tr').first().locator('input').first().fill('M');

    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/catalog/${RECOLOR_SLUG}/edit$`),
    );
  });

  test('upload a flat to color A; color B offers recolor → generates a flat', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/admin/catalog/${RECOLOR_SLUG}/edit`);

    // Color A's photo block is the first; its flat_front empty slot uploads a
    // flat directly. There are two "Загрузить: На белом · спереди" tiles (one
    // per color) — .first() targets color A.
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTitle('Загрузить: На белом · спереди').first().click(),
    ]);
    await chooser.setFiles(FIXTURE);

    await expect(page.locator('ul li')).toHaveCount(1);

    // Color B's flat_front slot now has a sibling flat source (color A "Зелёный")
    // → it offers a "✨ Сгенерировать" button. Open it and pick the recolor
    // candidate ("Перекрасить из «Зелёный»"). B gets a flat (count 1→2).
    await page
      .getByRole('button', { name: 'Сгенерировать', exact: false })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Перекрасить из «Зелёный»', exact: false })
      .first()
      .click();
    await expect(page.locator('ul li')).toHaveCount(2);
  });

  test('delete the recolor product', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${RECOLOR_SLUG}/edit`);
    await page.getByRole('button', { name: 'Удалить товар' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Удалить товар' })
      .click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
  });
});

// Batch "make all flats": upload two lifestyle shots, click one button, get a
// flat for each in one go (recipe 1, sequential). Separate product.
const BATCH_SLUG = 'e2e-batch-product';
const BATCH_DIR = path.join(process.cwd(), 'public', 'images', 'products', BATCH_SLUG);

test.describe.serial('batch make-all-flats', () => {
  test.afterAll(() => {
    try {
      rmSync(BATCH_DIR, { recursive: true, force: true });
    } catch {
      /* nothing uploaded */
    }
  });

  test('create product, upload two life shots', async ({ page }) => {
    await login(page);
    await page.goto('/admin/catalog/new');
    await page.locator('#name').fill('E2E Batch Product');
    await page.locator('#priceBase').fill('5555');
    await page.locator('#description').fill('E2E batch description.');
    const block = page.locator('section div.rounded-md.border').first();
    const inputs = block.locator('input[type="text"], input:not([type])');
    await inputs.nth(0).fill('green');
    await inputs.nth(1).fill('Зелёный');
    await block.locator('table tbody tr').first().locator('input').first().fill('M');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalog/${BATCH_SLUG}/edit$`));

    await uploadIntoSlot(page, 'Загрузить: Живое · спереди');
    await expect(page.locator('ul li')).toHaveCount(1);
    await uploadIntoSlot(page, 'Загрузить: Живое · сбоку');
    await expect(page.locator('ul li')).toHaveCount(2);
  });

  test('one click generates a flat for every life shot', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${BATCH_SLUG}/edit`);
    await expect(page.locator('ul li')).toHaveCount(2);

    // 2 life shots with empty paired flats → "✨ Сделать все на белом (2)".
    await page
      .getByRole('button', { name: 'Сделать все на белом', exact: false })
      .click();
    // Both flats appear (2 life + 2 flat = 4 occupied slots).
    await expect(page.locator('ul li')).toHaveCount(4);
  });

  test('delete the batch product', async ({ page }) => {
    await login(page);
    await page.goto(`/admin/catalog/${BATCH_SLUG}/edit`);
    await page.getByRole('button', { name: 'Удалить товар' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Удалить товар' })
      .click();
    await expect(page).toHaveURL(/\/admin\/catalog$/);
  });
});
