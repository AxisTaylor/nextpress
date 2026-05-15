import { test, expect } from '@playwright/test';

/**
 * CSS Variable Scoping Tests
 *
 * Validates that CSS custom properties defined in theme stylesheets (inside
 * @layer theme { :root { ... } }) are correctly extracted from the @scope
 * wrapper and remain accessible at :root level, and that the content wrapper
 * receives the correct layout CSS classes from the WP template.
 */

test.describe('CSS Variable Scoping', () => {
  test('theme @layer variables should resolve at :root level', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const text5xl = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--text-5xl').trim()
    );
    expect(text5xl).toBeTruthy();
    expect(text5xl).toBe('3rem');
  });

  test('WP font-size presets should resolve through variable chain', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const preset5xl = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--wp--preset--font-size--5-xl').trim()
    );
    expect(preset5xl).toBeTruthy();
  });

  test('h1 with has-5-xl-font-size should have correct computed size', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const h1 = page.locator('[data-rendered] h1.has-5-xl-font-size');
    await expect(h1).toBeVisible();

    const fontSize = await h1.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    // 3rem at 16px base = 48px
    expect(fontSize).toBeGreaterThanOrEqual(40);
  });

  test('heading hierarchy should have decreasing font sizes', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const sizes: number[] = [];

    for (const tag of headings) {
      const el = page.locator(`[data-rendered] ${tag}.wp-block-heading`).first();
      if (await el.count() === 0) continue;

      const fontSize = await el.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );
      sizes.push(fontSize);
    }

    expect(sizes.length).toBeGreaterThanOrEqual(4);

    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    }
  });

  test('color palette variables should resolve inside [data-rendered]', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const primaryBg = page.locator('[data-rendered] .has-primary-background-color').first();
    await expect(primaryBg).toBeVisible();

    const bgColor = await primaryBg.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
  });

  test('content wrapper should have layout CSS classes', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const wrapper = page.locator('[data-rendered] > div').first();
    await expect(wrapper).toBeVisible();

    const classes = await wrapper.evaluate((el) => el.className);
    expect(classes).toContain('is-layout-constrained');
    expect(classes).toContain('has-global-padding');
  });

  test('content should be constrained to max-width', async ({ page }) => {
    await page.goto('/typography-showcase/');
    await page.waitForLoadState('domcontentloaded');

    const paragraph = page.locator('[data-rendered] p').first();
    await expect(paragraph).toBeVisible();

    const maxWidth = await paragraph.evaluate((el) =>
      window.getComputedStyle(el).maxWidth
    );
    expect(maxWidth).not.toBe('none');
  });

  // The previous test here asserted that :root → :scope rewriting preserved
  // specificity (0,1,0) so the layout spacing rule beat .wp-block-quote's
  // margin reset via source order. With the introduction of cascade layers
  // (@layer wp-base, wp-theme), the relative priority of layout spacing vs
  // resets is no longer driven purely by specificity, so the indirect
  // blockquote-margin check is no longer a reliable signal. The :root →
  // :scope rewrite itself is covered directly in
  // packages/js/src/utils/scopeStyles.spec.ts; cascade outcomes are covered
  // in style-layers.spec.ts.
});
