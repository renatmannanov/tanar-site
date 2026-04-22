import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

for (const vp of viewports) {
  test.describe(`Responsive @ ${vp.name} (${vp.width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test('home page renders without horizontal overflow', async ({ page }) => {
      await page.goto('/');
      const header = page.getByTestId('site-header');
      await expect(header).toBeVisible();

      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      expect(bodyBox).not.toBeNull();
      expect(bodyBox!.width).toBeLessThanOrEqual(vp.width + 1);
    });

    test('header is visible and within viewport', async ({ page }) => {
      await page.goto('/');
      const header = page.getByTestId('site-header');
      await expect(header).toBeVisible();

      const box = await header.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
    });

    if (vp.name === 'mobile' || vp.name === 'tablet') {
      test('mobile burger button is visible', async ({ page }) => {
        await page.goto('/');
        const burger = page.getByLabel(/меню/i);
        await expect(burger).toBeVisible();
      });
    }

    if (vp.name === 'desktop') {
      test('desktop nav links are visible', async ({ page }) => {
        await page.goto('/');
        const nav = page.locator('nav.hidden.lg\\:flex');
        await expect(nav).toBeVisible();
      });
    }

    test('catalog page grid fits viewport', async ({ page }) => {
      await page.goto('/catalog');
      const header = page.getByTestId('site-header');
      await expect(header).toBeVisible();

      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      expect(bodyBox).not.toBeNull();
      expect(bodyBox!.width).toBeLessThanOrEqual(vp.width + 1);
    });
  });
}
