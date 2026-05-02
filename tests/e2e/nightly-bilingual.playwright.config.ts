import { defineConfig, devices } from '@playwright/test';

/**
 * DOS-AIO Nightly Bilingual 150% E2E Playwright Configuration
 * Validates logical rendering across Arabic (RTL) & English (LTR) and enforces SLA boundaries.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30000, // SLA bound per test mapping
  expect: {
    timeout: 5000, 
    toMatchSnapshot: { maxDiffPixelRatio: 0.05 }, // Visual regression bounds (<5% pixel differential allowed across UI changes)
  },
  fullyParallel: true, // Execute E2E tracks concurrently to finish nightly block < 5 mins
  retries: process.env.CI ? 2 : 0, 
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['json', {  outputFile: 'test-results/nightly-report.json' }]],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    baseURL: process.env.BASE_URL || 'https://staging.shahin-ai.com',
  },

  projects: [
    // ----------------------------------------------------
    // RTL (Arabic) Execution Matrix (SAMA/CMA focus)
    // ----------------------------------------------------
    {
      name: 'Chromium RTL (AR)',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh',
        viewport: { width: 1440, height: 900 },
      },
    },

    // ----------------------------------------------------
    // LTR (English) Execution Matrix (ISO/NIST focus)
    // ----------------------------------------------------
    {
      name: 'Chromium LTR (EN)',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'en-US',
        timezoneId: 'Europe/London',
        viewport: { width: 1440, height: 900 },
      },
    },

    // Mobile specific bound validations checking responsive grid structures natively
    {
      name: 'Mobile Safari LTR',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  // Asserting platform boots independently executing target testing logic locally if running local scripts.
  /* webServer: {
    command: 'pnpm preview',
    port: 4000,
    reuseExistingServer: true,
  }, */
});
