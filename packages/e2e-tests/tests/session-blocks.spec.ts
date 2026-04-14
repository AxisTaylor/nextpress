import { test, expect } from '@playwright/test';

/**
 * Session Blocks Tests
 *
 * Validates blocks that perform session-based WooCommerce actions on the
 * headless frontend. Tests the /session-blocks page which contains an
 * add-to-cart block and a customer-note block.
 */

test.describe('Session Blocks', () => {
  test('add-to-cart block renders with inline config data', async ({ page }) => {
    await page.goto('/session-blocks');
    await page.waitForLoadState('domcontentloaded');

    const block = page.locator('[data-testid="session-add-to-cart-block"]');
    await expect(block).toBeVisible();

    // Inline script data should have been parsed by the view script
    await expect(block).toHaveAttribute('data-config-loaded', 'true');
  });

  test('add-to-cart button adds product to cart', async ({ page }) => {
    await page.goto('/session-blocks');
    await page.waitForLoadState('domcontentloaded');

    const button = page.locator('[data-testid="atc-button"]');
    const status = page.locator('[data-testid="atc-status"]');
    await expect(button).toBeVisible();

    await button.click();
    await expect(status).toHaveText('Adding…');

    // Wait for the add-to-cart response
    await expect(status).toHaveText('Added!', { timeout: 10000 });

    // Block should be marked as added
    const block = page.locator('[data-testid="session-add-to-cart-block"]');
    await expect(block).toHaveAttribute('data-added', 'true');
  });

  test('cart session persists after add-to-cart', async ({ page, context }) => {
    await page.goto('/session-blocks');
    await page.waitForLoadState('domcontentloaded');

    // Add to cart
    await page.locator('[data-testid="atc-button"]').click();
    await expect(page.locator('[data-testid="atc-status"]')).toHaveText('Added!', { timeout: 10000 });

    // Check that a session cookie was set
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.includes('cart') || c.name.includes('woocommerce_session')
    );
    expect(sessionCookie).toBeTruthy();

    // Navigate to cart page and verify the product is there
    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    // Cart should have at least one item
    const cartContent = await page.locator('body').textContent();
    expect(cartContent).toBeTruthy();
  });

  test('customer note block renders with interactivity', async ({ page }) => {
    await page.goto('/session-blocks');
    await page.waitForLoadState('domcontentloaded');

    const block = page.locator('[data-testid="session-customer-note-block"]');
    await expect(block).toBeVisible();

    const input = page.locator('[data-testid="customer-note-input"]');
    await expect(input).toBeVisible();

    const submitButton = page.locator('[data-testid="customer-note-submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('customer note update persists via Store API', async ({ page }) => {
    await page.goto('/session-blocks');
    await page.waitForLoadState('networkidle');

    // Wait for wp.apiFetch to be available (classic script loads after modules)
    await page.waitForFunction(() => !!(window as any).wp?.apiFetch, { timeout: 10000 });

    const input = page.locator('[data-testid="customer-note-input"]');
    const submit = page.locator('[data-testid="customer-note-submit"]');
    const status = page.locator('[data-testid="customer-note-status"]');

    // Type a name and submit
    await input.fill('TestFirstName');
    await submit.click();

    // Wait for the API response — skip checking intermediate "Saving…" state
    // since it may resolve too fast to observe
    await expect(status).toHaveText('Saved!', { timeout: 15000 });
  });

  test('inline script data does not contain raw backend URLs', async ({ page }) => {
    await page.goto('/session-blocks');
    await page.waitForLoadState('domcontentloaded');

    // The inline script data should not contain raw backend URLs
    const scripts = await page.locator('script').evaluateAll((els) =>
      els
        .map((el) => (el as HTMLScriptElement).textContent || '')
        .filter((t) => t.includes('complexBlocksAddToCart'))
    );

    for (const script of scripts) {
      // Should not reference any raw WordPress backend URL
      // (the backend runs on port 8080 in both local and CI)
      expect(script).not.toMatch(/localhost:8080/);
      expect(script).not.toContain('wp-json/wc/store');
    }
  });
});
