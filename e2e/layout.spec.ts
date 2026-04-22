import { test, expect } from '@playwright/test';

test('header and footer are present on home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-header')).toBeVisible();
  await expect(page.getByTestId('site-footer')).toBeVisible();
});

test('catalog link navigates to /catalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Каталог' }).first().click();
  await expect(page).toHaveURL(/\/catalog/);
});

test('footer contains brand name and location', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByTestId('site-footer');
  await expect(footer).toContainText('Tanar');
  await expect(footer).toContainText('Казахстан');
});
