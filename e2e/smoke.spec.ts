import { test, expect, Page } from '@playwright/test';

const PRODUCT_SLUG = 'shell-jacket-khan';
const POST_SLUG = 'khan-tengri-ascent';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  return errors;
}

test.describe('smoke', () => {
  const urls = [
    '/',
    '/catalog',
    `/catalog/${PRODUCT_SLUG}`,
    '/blog',
    `/blog/${POST_SLUG}`,
  ];

  for (const url of urls) {
    test(`no errors on ${url}`, async ({ page }) => {
      const errors = collectErrors(page);
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId('site-header')).toBeVisible();
      await expect(page.getByTestId('site-footer')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('catalog shows all 10 product cards', async ({ page }) => {
    await page.goto('/catalog');
    const cards = page.getByTestId('product-card');
    expect(await cards.count()).toBe(10);
  });

  test('coming-soon products show "Скоро" badge', async ({ page }) => {
    await page.goto('/catalog/pants-charyn');
    await expect(page.getByText(/Скоро/i).first()).toBeVisible();
  });

  test('catalog filter by jackets', async ({ page }) => {
    await page.goto('/catalog?category=jackets');
    const cards = page.getByTestId('product-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    // Все видимые карточки — категории jackets
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveAttribute('data-category', 'jackets');
    }
  });

  test('blog shows exactly 6 posts', async ({ page }) => {
    await page.goto('/blog');
    const cards = page.getByTestId('blog-card');
    expect(await cards.count()).toBe(6);
  });

  test('metadata titles are correct', async ({ page }) => {
    await page.goto('/');
    expect(await page.title()).toMatch(/Tanar/);
    await page.goto('/catalog');
    expect(await page.title()).toBe('Каталог — Tanar');
    await page.goto('/blog');
    expect(await page.title()).toBe('Журнал — Tanar');
    await page.goto(`/catalog/${PRODUCT_SLUG}`);
    expect(await page.title()).toMatch(/Tanar$/);
    await page.goto(`/blog/${POST_SLUG}`);
    expect(await page.title()).toMatch(/Tanar$/);
  });

  test('navigation from home works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /смотреть каталог/i }).click();
    await expect(page).toHaveURL('/catalog');
  });
});
