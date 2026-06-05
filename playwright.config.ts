import { defineConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// Load .env.local into the Playwright (test runner) process the same way Next
// loads it for the dev server — admin.spec.ts reads process.env.ADMIN_PASSWORD.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx next dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    // PHOTOGEN_FAKE=1 makes photogen use a no-op provider so the photo-
    // generation e2e never calls (or pays for) Gemini. webServer.env is merged
    // into the spawned dev server's environment (cross-platform). NOTE: a
    // reused server (reuseExistingServer) must already have this set.
    env: { PHOTOGEN_FAKE: '1' },
  },
  projects: [
    { name: 'chromium', use: { channel: 'chromium' } },
  ],
});
