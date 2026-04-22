import { test, expect } from '@playwright/test';

test('blog page loads with 200 and shows heading', async ({ page }) => {
  const response = await page.goto('/blog');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Журнал' })).toBeVisible();
});

test('placeholder post with underscore prefix is filtered out', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByText('Заглушка')).not.toBeVisible();
});

test('shows blog cards or empty state message', async ({ page }) => {
  await page.goto('/blog');
  const main = page.getByRole('main');
  const cards = main.locator('[data-testid="blog-card"]');
  const emptyMsg = main.getByText('Скоро здесь появятся истории');
  const hasCards = await cards.count() > 0;
  const hasEmpty = await emptyMsg.isVisible().catch(() => false);
  expect(hasCards || hasEmpty).toBe(true);
});

test('no page or console errors on /blog', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/blog');
  expect(errors).toEqual([]);
});
