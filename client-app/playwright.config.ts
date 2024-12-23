import { defineConfig, devices } from '@playwright/test';

// Read environment from process.env
const ENV = process.env.ENV || 'dev';

// Environment-specific configurations
const envConfigs = {
  dev: {
    baseURL: 'http://localhost:4200',
    timeout: 30000,
  },
  staging: {
    baseURL: 'https://staging.ntnews.com',
    timeout: 60000,
  },
  prod: {
    baseURL: 'https://brave-sea-0ef71fa1e.4.azurestaticapps.net/',
    timeout: 120000,  // Longer timeout for production
  }
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env['CI'] ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: envConfigs[ENV].baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    actionTimeout: envConfigs[ENV].timeout,
    navigationTimeout: envConfigs[ENV].timeout,
  },
  timeout: envConfigs[ENV].timeout,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],

  /* Run your local dev server before starting the tests */
  ...(ENV === 'dev' ? {
    webServer: {
      command: 'npm run start',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120000,
    }
  } : {})
});
