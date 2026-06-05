import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';

// Admin editing of site_settings (contacts) and faq_items, verified through to
// the storefront. Reuses the .env.local admin password the dev server reads.
const PASSWORD = process.env.ADMIN_PASSWORD;

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Пароль').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
}

test.beforeAll(() => {
  if (!PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env.local)');
  }
});

// site_settings has no DELETE in the seed (idempotent insert-if-empty), so a
// reseed won't restore edited values. Clear the row explicitly, then reseed so
// the next run starts from the canonical constants again.
test.afterAll(() => {
  execSync(
    'docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "DELETE FROM site_settings; DELETE FROM faq_items;"',
    { stdio: 'ignore' },
  );
  execSync('npm run db:seed', { stdio: 'ignore' });
});

test.describe.serial('site admin', () => {
  test('edit a contact phone name → reflected on /contacts', async ({ page }) => {
    await login(page);
    await page.goto('/admin/settings');

    const nameField = page.getByLabel('Имя при телефоне 1');
    await nameField.fill('Тест-Имя');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByText('Сохранено.')).toBeVisible();

    await page.goto('/contacts');
    // Name appears both in the contacts block and the footer — scope to first.
    await expect(page.getByText('Тест-Имя').first()).toBeVisible();
  });

  test('add a FAQ item → shows on /faq, then delete it', async ({ page }) => {
    await login(page);
    await page.goto('/admin/faq');

    // The "new item" block has id-scoped fields (existing items also have
    // «Вопрос»/«Ответ» labels), so target the new-* ids directly.
    await page.locator('#new-q').fill('E2E вопрос?');
    await page.locator('#new-a').fill('E2E ответ.');
    await page.getByRole('button', { name: 'Добавить' }).click();

    // Storefront shows it (answer lives in a collapsed <details>).
    await page.goto('/faq');
    await expect(page.getByText('E2E вопрос?')).toBeVisible();
    await page.getByText('E2E вопрос?').click();
    await expect(page.getByText('E2E ответ.')).toBeVisible();
  });
});
