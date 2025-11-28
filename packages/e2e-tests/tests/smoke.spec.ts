import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 *
 * Basic tests to verify the Next.js application and WordPress backend are running
 * and basic functionality works.
 */

test.describe('Smoke Tests', () => {
  test('Next.js homepage loads', async ({ page }) => {
    await page.goto('/');

    // Check that the page loaded successfully
    await expect(page).toHaveTitle(/./); // Has some title
    await expect(page.locator('body')).toBeVisible();
  });

  test('WordPress content renders', async ({ page }) => {
    await page.goto('/');

    // Check for WordPress-specific content or elements
    // This test will be more specific once we know the actual page structure
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('Page has no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Should have no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
