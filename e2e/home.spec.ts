import { test, expect } from '@playwright/test';

test('hero heading is visible', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toContainText('Встречаем рассвет');
});

test('four category cards are present', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByTestId('category-card');
  await expect(cards).toHaveCount(4);
});

test('catalog button navigates to /catalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Смотреть каталог' }).click();
  await expect(page).toHaveURL(/\/catalog/);
});

test('all main sections are visible', async ({ page }) => {
  await page.goto('/');
  for (const title of ['Категории', 'Избранное', 'Рождены в горах', 'Журнал']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
});
