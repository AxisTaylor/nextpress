import { test, expect } from '@playwright/test';

/**
 * Style Isolation Tests
 *
 * Validates that WordPress styles loaded via Stylesheets are scoped
 * to [data-rendered] elements and do not leak into the app layout (Navbar, Footer).
 *
 * WordPress stylesheets commonly define rules like `a { text-decoration: underline }`
 * which, without scoping, would affect navigation links outside WordPress content.
 */

test.describe('Style Isolation', () => {
  test('navbar links should not have underline on WordPress content pages', async ({ page }) => {
    // Navigate to the homepage which renders WordPress content + stylesheets
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get navbar anchor elements
    const navLinks = page.locator('header nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    // Check each navbar link's computed text-decoration
    for (let i = 0; i < count; i++) {
      const textDecoration = await navLinks.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).textDecorationLine;
      });

      expect(textDecoration).not.toBe('underline');
    }
  });

  test('navbar links should not have underline on cart page', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    const navLinks = page.locator('header nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const textDecoration = await navLinks.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).textDecorationLine;
      });

      expect(textDecoration).not.toBe('underline');
    }
  });

  test('footer should not be affected by WordPress styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should retain its Tailwind-defined background color (gray-800)
    // and not be overridden by WordPress styles (e.g., white or transparent)
    const bgColor = await footer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should not be transparent or white — any non-trivial color means Tailwind applied
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('WordPress content should be wrapped in [data-rendered]', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The Content component should render a [data-rendered] wrapper
    const contentWrapper = page.locator('[data-rendered]');
    const count = await contentWrapper.count();
    expect(count).toBeGreaterThan(0);
  });

  test('WordPress stylesheets should use @scope for isolation', async ({ page }) => {
    const scopedResponses: string[] = [];

    // Monitor CSS responses from the proxy
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('text/css') && (url.includes('/wp-assets/') || url.includes('/wp-internal-assets/'))) {
        const body = await response.text().catch(() => '');
        if (body.includes('@scope')) {
          scopedResponses.push(url);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // At least some CSS responses should be scoped
    expect(scopedResponses.length).toBeGreaterThan(0);
  });

  test('inline WordPress styles should be scoped', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get inline style tags with their IDs (WordPress styles have IDs like "{handle}-before"/"{handle}-after")
    const styles = await page.locator('style').evaluateAll((styles) =>
      styles.map((style) => ({
        id: (style as HTMLStyleElement).id,
        content: (style as HTMLStyleElement).textContent || '',
      }))
    );

    // WordPress inline styles from Stylesheets have id attributes.
    // Exclude framework styles (Next.js fonts, image optimization, Tailwind)
    // and NextPress marker styles (nextpress-stylesheets-start/end).
    const wpInlineStyles = styles.filter(s =>
      s.content.length > 0 &&
      s.id.length > 0 &&
      !s.content.includes('__nextjs') &&
      !s.content.includes('contain-intrinsic-size') &&
      !s.content.includes('tailwind') &&
      !s.id.startsWith('nextpress-')
    );

    // If there are WordPress inline styles, they should be wrapped in @scope
    wpInlineStyles.forEach(s => {
      expect(s.content).toContain('@scope');
    });
  });
});
