import { test, expect } from '@playwright/test';

/**
 * Block Content Tests
 *
 * Validates that core Gutenberg blocks render correctly on the headless
 * frontend via NextPress. Tests the /block-showcase page which contains
 * groups, columns, headings, paragraphs, buttons, and separators.
 */

test.describe('Block Content Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/block-showcase');
    await page.waitForLoadState('domcontentloaded');
  });

  test('page loads with data-rendered wrapper', async ({ page }) => {
    const wrapper = page.locator('[data-rendered]');
    await expect(wrapper).toBeVisible();
  });

  test('group block renders with correct classes', async ({ page }) => {
    const group = page.locator('.wp-block-group.alignfull').first();
    await expect(group).toBeVisible();
  });

  test('columns block renders two columns', async ({ page }) => {
    const columns = page.locator('.wp-block-columns').first();
    await expect(columns).toBeVisible();

    const columnCount = await columns.locator('.wp-block-column').count();
    expect(columnCount).toBe(2);
  });

  test('headings render with correct tags', async ({ page }) => {
    await expect(page.locator('[data-rendered] h1').first()).toBeVisible();
    await expect(page.locator('[data-rendered] h2').first()).toBeVisible();
    await expect(page.locator('[data-rendered] h3').first()).toBeVisible();
  });

  test('buttons render with correct hrefs', async ({ page }) => {
    const primaryButton = page.locator('.wp-block-button.is-style-fill a');
    await expect(primaryButton).toBeVisible();
    await expect(primaryButton).toHaveAttribute('href', '#test-link');

    const outlineButton = page.locator('.wp-block-button.is-style-outline a');
    await expect(outlineButton).toBeVisible();
    await expect(outlineButton).toHaveAttribute('href', '#test-link-2');
  });

  test('separator block renders', async ({ page }) => {
    const separator = page.locator('.wp-block-separator');
    await expect(separator).toBeVisible();
  });

  test('drop cap paragraph renders', async ({ page }) => {
    const dropCap = page.locator('.has-drop-cap');
    await expect(dropCap).toBeVisible();
  });

  test('block styles are applied via scoped CSS', async ({ page }) => {
    // The outer group block has padding set via WP spacing presets —
    // verify the computed padding is non-zero (scoped CSS applied).
    const group = page.locator('.wp-block-group.alignfull').first();
    const paddingTop = await group.evaluate((el) =>
      window.getComputedStyle(el).paddingTop
    );
    // Should have some padding set (not 0px)
    expect(paddingTop).not.toBe('0px');
  });

  test('no console errors on block-showcase page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore favicon and known benign errors
        if (!text.includes('favicon') && !text.includes('manifest.json')) {
          errors.push(text);
        }
      }
    });

    // Re-navigate to capture from the start
    await page.goto('/block-showcase');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
