import { test, expect } from '@playwright/test';

/**
 * Interactive Blocks Tests
 *
 * Validates blocks that use viewScriptModule, @wordpress/interactivity,
 * and deferred classic scripts on the headless frontend.
 * Tests the /interactive-blocks page.
 */

test.describe('Interactive Blocks', () => {
  test('interactive counter increments on click', async ({ page }) => {
    await page.goto('/interactive-blocks');
    await page.waitForLoadState('domcontentloaded');

    const counter = page.locator('[data-testid="counter-value"]');
    await expect(counter).toHaveText('0');

    await page.locator('[data-testid="counter-button"]').click();
    await expect(counter).toHaveText('1');

    await page.locator('[data-testid="counter-button"]').click();
    await expect(counter).toHaveText('2');
  });

  test('interactive toggle shows and hides content', async ({ page }) => {
    await page.goto('/interactive-blocks');
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('[data-testid="toggle-content"]');
    await expect(content).toBeHidden();

    await page.locator('[data-testid="toggle-button"]').click();
    await expect(content).toBeVisible();

    await page.locator('[data-testid="toggle-button"]').click();
    await expect(content).toBeHidden();
  });

  test('deferred view script executes after DOM is ready', async ({ page }) => {
    await page.goto('/interactive-blocks');
    await page.waitForLoadState('domcontentloaded');

    const block = page.locator('[data-testid="deferred-view-block"]');
    await expect(block).toHaveAttribute('data-initialized', 'true');

    const text = page.locator('[data-testid="deferred-view-text"]');
    await expect(text).toHaveText('Script loaded!');
  });

  test('script modules are loaded as type="module"', async ({ page }) => {
    await page.goto('/interactive-blocks');
    await page.waitForLoadState('domcontentloaded');

    // Check for <script type="module"> tags in the DOM
    const moduleScripts = await page.locator('script[type="module"]').count();
    expect(moduleScripts).toBeGreaterThan(0);
  });

  test('no export syntax errors in console', async ({ page }) => {
    const syntaxErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Unexpected token')) {
        syntaxErrors.push(msg.text());
      }
    });

    await page.goto('/interactive-blocks');
    await page.waitForLoadState('networkidle');

    // If modules are loaded as classic scripts, they throw "Unexpected token 'export'"
    expect(syntaxErrors).toHaveLength(0);
  });

  test('core details block is interactive', async ({ page }) => {
    await page.goto('/interactive-blocks');
    await page.waitForLoadState('domcontentloaded');

    const details = page.locator('.wp-block-details');
    const content = details.locator('p');

    // Details should be closed initially
    await expect(content).toBeHidden();

    // Click summary to open
    await details.locator('summary').click();
    await expect(content).toBeVisible();

    // Click again to close
    await details.locator('summary').click();
    await expect(content).toBeHidden();
  });
});
