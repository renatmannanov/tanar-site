import { test, expect } from '@playwright/test';

test('nonexistent product slug returns 404', async ({ page }) => {
  const response = await page.goto('/catalog/nonexistent-slug');
  expect(response?.status()).toBe(404);
});
