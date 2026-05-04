import { test, expect } from '@playwright/test';

test('catalog page loads with 200', async ({ page }) => {
  const response = await page.goto('/catalog');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Каталог' })).toBeVisible();
});

test('all filter chips are present', async ({ page }) => {
  await page.goto('/catalog');
  const main = page.getByRole('main');
  for (const label of ['Все', 'Куртки', 'Худи', 'Футболки', 'Штаны', 'Шорты']) {
    await expect(main.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
});

test('clicking "Куртки" chip filters by category', async ({ page }) => {
  await page.goto('/catalog');
  const main = page.getByRole('main');
  await main.getByRole('link', { name: 'Куртки', exact: true }).click();
  await expect(page).toHaveURL(/category=jackets/);
  const activeChip = main.getByRole('link', { name: 'Куртки', exact: true });
  await expect(activeChip).toHaveClass(/bg-stone-900/);
});

test('no page or console errors on /catalog', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/catalog');
  expect(errors).toEqual([]);
});
