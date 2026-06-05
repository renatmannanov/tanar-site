import { test, expect } from '@playwright/test';

test.describe('contacts page', () => {
  test('renders heading, phone, address and Instagram', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.getByRole('heading', { name: 'Контакты' })).toBeVisible();
    // Phone link in the contacts block (also appears in the footer — scope it).
    await expect(
      page.getByRole('link', { name: '+7 701 744 38 73', exact: true })
    ).toBeVisible();
    await expect(page.getByText('Розыбакиева').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: '@tanar_qazaqstan' })
    ).toHaveAttribute('href', /instagram\.com/);
  });
});

test.describe('faq page', () => {
  test('renders heading and key content', async ({ page }) => {
    await page.goto('/faq');
    await expect(
      page.getByRole('heading', { name: 'Частые вопросы' })
    ).toBeVisible();
    // Answers live inside collapsed <details> — open the return-policy one.
    await page.getByText('Возврат и обмен?').click();
    await expect(page.getByText('14 календарных дней')).toBeVisible();
    // Pickup answer is in another accordion item — assert it exists in the DOM.
    await expect(page.getByText('Розыбакиева').first()).toBeAttached();
  });
});

test.describe('footer links', () => {
  test('has no dead # links and points to real routes', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByTestId('site-footer');
    await expect(footer.locator('a[href="#"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/contacts"]')).toHaveCount(1);
    await expect(footer.locator('a[href="/faq"]')).toHaveCount(1);
    await expect(footer.locator('a[href="/blog"]')).toHaveCount(1);
    await expect(
      footer.locator('a[href*="instagram.com"]')
    ).toHaveCount(1);
  });
});

test.describe('header nav', () => {
  test('Контакты link navigates to /contacts', async ({ page }) => {
    await page.goto('/');
    await page
      .getByTestId('site-header')
      .getByRole('link', { name: 'Контакты' })
      .click();
    await expect(page).toHaveURL(/\/contacts$/);
  });
});

test.describe('blog articles', () => {
  const newSlugs = ['o-brende-tanar', 'ob-osnovatele-ayman', 'istoriya-tanar'];

  for (const slug of newSlugs) {
    test(`article ${slug} opens (200)`, async ({ page }) => {
      const res = await page.goto(`/blog/${slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    });
  }

  test('removed placeholder story returns 404', async ({ page }) => {
    const res = await page.goto('/blog/tanar-brand-story');
    expect(res?.status()).toBe(404);
  });
});
