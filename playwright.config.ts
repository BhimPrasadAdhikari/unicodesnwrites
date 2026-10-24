import { defineConfig, devices } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {},
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_REUSE_ONLY === '1' ? undefined : {
    command: 'npm run dev:e2e:sandbox',
    url: 'http://127.0.0.1:3100/signup',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
