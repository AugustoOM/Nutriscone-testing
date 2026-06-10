import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.STRESS_TEST_BASE_URL ?? 'https://nutriscone-fyo2.vercel.app';

export default defineConfig({
  testDir: './stress-tests',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-stress-report', open: 'never' }],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-stress',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
