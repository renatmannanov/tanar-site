import { test, expect } from '@playwright/test';

test('nonexistent blog slug returns 404', async ({ page }) => {
  const response = await page.goto('/blog/nonexistent');
  expect(response?.status()).toBe(404);
});
