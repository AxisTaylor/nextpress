import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for NextPress E2E tests
 *
 * Tests validate:
 * - React Server Components (RenderStylesheets, HeadScripts, BodyScripts)
 * - WordPress content rendering
 * - Asset loading and proxy routing
 * - WooCommerce flows
 * - Multi-WordPress instance support
 */
export default defineConfig({
  testDir: './tests',

  // Stop servers after all tests complete
  globalTeardown: './global-teardown.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Use more workers for faster local testing
  workers: process.env.CI ? 1 : 4,

  // Timeout for each test (in milliseconds)
  timeout: 60000, // 60 seconds

  // Reporter to use
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on additional browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run your local dev server before starting the tests
  // In CI, servers are started automatically. Locally, reuse existing servers.
  webServer: [
    {
      command: 'npm run dev:wp-backend',
      cwd: '../..',
      // PHP service waits for DB healthcheck (wp_options table exists) before starting
      url: 'http://localhost:8080/wp/graphql',
      timeout: 180000, // 3 minutes for MySQL init + DB import in CI
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:wp-frontend',
      cwd: '../..',
      url: 'http://localhost:3000',
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
