import { test, expect } from '@playwright/test';

/**
 * Style Layer Tests
 *
 * Validates that NextPress wraps WP-derived CSS in cascade layers so the
 * cascade priority is:
 *
 *   wp-base (proxied .css from assetsByUri)
 *   < wp-theme (globalStyles.stylesheet + customCss)
 *   < unlayered (Stylesheets before/after inline content from assetsByUri,
 *     app CSS)
 *   < inline style="..."
 *
 * This makes per-instance block-supports CSS (e.g. blockGap explicitly set
 * to 0 on a core/columns block) reliably win over theme.json defaults,
 * even when theme.json output appears later in the document via duplicate
 * style emissions.
 *
 * Seeded pages (live in the dev backup SQL dump):
 * - /test-layer-zero-blockgap — columns block with style.spacing.blockGap
 *   explicitly set to var:preset|spacing|0. Per-instance core-block-supports
 *   rule emits gap: 0 0; theme.json says core/columns blockGap is
 *   var(--spacing-12). Per-instance must win.
 * - /test-layer-default-blockgap — columns block with no override. Falls
 *   back to theme.json default (var(--spacing-12) = 48px).
 */

test.describe('Style Cascade Layers — Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-layer-default-blockgap');
    await page.waitForLoadState('domcontentloaded');
  });

  test('@layer wp-base, wp-theme is declared before any layered content', async ({ page }) => {
    const layerOrder = await page.locator('#nextpress-layer-order').textContent();
    expect(layerOrder).toContain('@layer wp-base, wp-theme;');

    // Layer order must come before any @layer wp-base { ... } or
    // @layer wp-theme { ... } content. Otherwise the order is determined
    // by first-encounter and we lose the guarantee.
    const html = await page.content();
    const orderDeclIdx = html.indexOf('@layer wp-base, wp-theme;');
    const firstLayerBaseIdx = html.indexOf('@layer wp-base {');
    const firstLayerThemeIdx = html.indexOf('@layer wp-theme {');

    expect(orderDeclIdx).toBeGreaterThan(-1);
    if (firstLayerBaseIdx !== -1) {
      expect(orderDeclIdx).toBeLessThan(firstLayerBaseIdx);
    }
    if (firstLayerThemeIdx !== -1) {
      expect(orderDeclIdx).toBeLessThan(firstLayerThemeIdx);
    }
  });

  test('globalStyles content is wrapped in @layer wp-theme', async ({ page }) => {
    const globalStyles = await page.locator('#nextpress-global-styles').textContent();
    test.skip(!globalStyles, 'No globalStyles emitted by this WP backend');

    expect(globalStyles).toContain('@layer wp-theme {');
    expect(globalStyles).toContain('@scope ([data-rendered]) {');
    // @layer must wrap @scope, not the other way around — @scope inside
    // @layer is what gives the cascade priority drop.
    expect(globalStyles!.indexOf('@layer wp-theme')).toBeLessThan(
      globalStyles!.indexOf('@scope')
    );
  });

  test('proxied .css files come back wrapped in @layer wp-base', async ({ page }) => {
    const proxiedCssBodies: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (
        contentType.includes('text/css') &&
        (url.includes('/wp-assets/') || url.includes('/wp-internal-assets/'))
      ) {
        const body = await response.text().catch(() => '');
        if (body) proxiedCssBodies.push(body);
      }
    });

    await page.goto('/test-layer-default-blockgap');
    await page.waitForLoadState('networkidle');

    expect(proxiedCssBodies.length).toBeGreaterThan(0);
    for (const body of proxiedCssBodies) {
      expect(body).toContain('@layer wp-base {');
      expect(body).toContain('@scope ([data-rendered]) {');
    }
  });

  test('Stylesheets before/after inline content stays unlayered', async ({ page }) => {
    // Stylesheets emits inline <style> tags with id ending in -before or
    // -inline-css (set by Stylesheets.tsx).
    const inlineSheets = await page.locator('style').evaluateAll((nodes) =>
      nodes
        .map((n) => ({
          id: (n as HTMLStyleElement).id,
          content: (n as HTMLStyleElement).textContent || '',
        }))
        .filter(
          (s) =>
            (s.id.endsWith('-before') || s.id.endsWith('-inline-css')) &&
            s.content.length > 0
        )
    );

    test.skip(inlineSheets.length === 0, 'No inline Stylesheets payloads on this page');

    for (const sheet of inlineSheets) {
      // Inline before/after must be @scope-wrapped (isolation) but NOT
      // layered, so per-instance overrides beat theme.json globalStyles.
      expect(sheet.content).toContain('@scope ([data-rendered]) {');
      expect(sheet.content).not.toContain('@layer wp-base');
      expect(sheet.content).not.toContain('@layer wp-theme');
    }
  });
});

test.describe('Style Cascade Layers — Behavior', () => {
  test('columns with explicit blockGap=0 win over theme.json default (48px)', async ({ page }) => {
    await page.goto('/test-layer-zero-blockgap');
    await page.waitForLoadState('domcontentloaded');

    const columns = page.locator('#layer-zero-gap-columns');
    await expect(columns).toBeVisible();

    const gap = await columns.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { row: cs.rowGap, col: cs.columnGap };
    });

    // Per-instance core-block-supports rule (unlayered) must beat
    // theme.json's :scope :where(.wp-block-columns-is-layout-flex){gap:48px}
    // (wp-theme layer).
    expect(gap.row).toBe('0px');
    expect(gap.col).toBe('0px');
  });

  test('columns without override fall back to theme.json default (48px)', async ({ page }) => {
    await page.goto('/test-layer-default-blockgap');
    await page.waitForLoadState('domcontentloaded');

    const columns = page.locator('#layer-default-gap-columns');
    await expect(columns).toBeVisible();

    const gap = await columns.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { row: cs.rowGap, col: cs.columnGap };
    });

    // theme.json says core/columns blockGap is var(--spacing-12) = 3rem = 48px.
    // No per-instance override exists, so this is what the cascade resolves to.
    expect(gap.row).toBe('48px');
    expect(gap.col).toBe('48px');
  });

  test('unlayered author CSS beats wp-theme layered rules', async ({ page }) => {
    // Validates the cascade rule that backs everything above: an unlayered
    // rule against the same element MUST win regardless of source order or
    // matching specificity. This is the foundation of the fix.
    await page.goto('/test-layer-default-blockgap');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const target = document.createElement('div');
      target.id = 'nextpress-cascade-probe';
      const scope = document.querySelector('[data-rendered]');
      (scope || document.body).appendChild(target);

      const layered = document.createElement('style');
      layered.textContent =
        '@layer wp-theme { @scope ([data-rendered]) { #nextpress-cascade-probe { color: rgb(255, 0, 0); } } }';
      document.head.appendChild(layered);
      const layeredOnly = getComputedStyle(target).color;

      const unlayered = document.createElement('style');
      unlayered.textContent = '#nextpress-cascade-probe { color: rgb(0, 0, 255); }';
      document.head.appendChild(unlayered);
      const afterUnlayered = getComputedStyle(target).color;

      layered.remove();
      unlayered.remove();
      target.remove();
      return { layeredOnly, afterUnlayered };
    });

    expect(result.layeredOnly).toBe('rgb(255, 0, 0)');
    expect(result.afterUnlayered).toBe('rgb(0, 0, 255)');
  });

  test('wp-theme layered rules beat wp-base layered rules', async ({ page }) => {
    await page.goto('/test-layer-default-blockgap');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const target = document.createElement('div');
      target.id = 'nextpress-cascade-probe';
      const scope = document.querySelector('[data-rendered]');
      (scope || document.body).appendChild(target);

      const base = document.createElement('style');
      base.textContent =
        '@layer wp-base { @scope ([data-rendered]) { #nextpress-cascade-probe { color: rgb(0, 128, 0); } } }';
      document.head.appendChild(base);
      const baseOnly = getComputedStyle(target).color;

      const theme = document.createElement('style');
      theme.textContent =
        '@layer wp-theme { @scope ([data-rendered]) { #nextpress-cascade-probe { color: rgb(128, 0, 128); } } }';
      document.head.appendChild(theme);
      const afterTheme = getComputedStyle(target).color;

      base.remove();
      theme.remove();
      target.remove();
      return { baseOnly, afterTheme };
    });

    expect(result.baseOnly).toBe('rgb(0, 128, 0)');
    // wp-theme wins because it was declared after wp-base in the layer-order
    // statement (@layer wp-base, wp-theme).
    expect(result.afterTheme).toBe('rgb(128, 0, 128)');
  });
});
