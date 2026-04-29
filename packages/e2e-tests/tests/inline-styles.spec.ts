import { test, expect } from '@playwright/test';

/**
 * Inline Styles Tests
 *
 * Validates that WordPress inline styles (wp_add_inline_style) registered
 * as "after" scripts on enqueued stylesheets are rendered in the HTML
 * output of the headless frontend.
 *
 * The custom-block-theme in backend-4-examples registers a test inline
 * style on `custom-block-theme-style` with the class `.nextpress-inline-test`.
 */

test.describe('Inline Stylesheet Rendering', () => {
  test('should render inline "after" styles in the HTML', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find the inline style tag for the theme stylesheet's after content
    const inlineStyle = page.locator('style[data-href="custom-block-theme-style-after-inline"]');
    const count = await inlineStyle.count();

    // If React uses data-href, check that. Otherwise check id.
    if (count === 0) {
      // React may render the href as data-href or the style may use the id attribute
      const byId = page.locator('style#custom-block-theme-style-inline-css');
      const idCount = await byId.count();

      if (idCount === 0) {
        // Search all style tags for the test class
        const allStyles = await page.locator('style').evaluateAll((styles) =>
          styles.map((s) => s.textContent || '')
        );

        const hasInlineTest = allStyles.some((content) =>
          content.includes('.nextpress-inline-test')
        );

        expect(hasInlineTest).toBe(true);
      } else {
        const content = await byId.textContent();
        expect(content).toContain('.nextpress-inline-test');
      }
    } else {
      const content = await inlineStyle.textContent();
      expect(content).toContain('.nextpress-inline-test');
    }
  });

  test('inline "after" style should contain the expected CSS rule', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get all style tag contents
    const allStyleContents = await page.locator('style').evaluateAll((styles) =>
      styles.map((s) => s.textContent || '')
    );

    // Find the one containing our test class
    const testStyle = allStyleContents.find((content) =>
      content.includes('.nextpress-inline-test')
    );

    expect(testStyle).toBeDefined();
    expect(testStyle).toContain('--inline-test: passed');
    expect(testStyle).toContain('color: green');
  });

  test('inline "after" style should not be deduplicated with its parent stylesheet', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The parent stylesheet link should exist
    const themeLink = page.locator('link[rel="stylesheet"][href*="custom-block-theme"]');
    await expect(themeLink.first()).toBeAttached();

    // AND the inline after style should also exist (not deduplicated)
    const allStyleContents = await page.locator('style').evaluateAll((styles) =>
      styles.map((s) => s.textContent || '')
    );

    const hasInlineTest = allStyleContents.some((content) =>
      content.includes('.nextpress-inline-test')
    );

    expect(hasInlineTest).toBe(true);
  });
});
