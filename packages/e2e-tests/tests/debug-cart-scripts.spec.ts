import { test, expect } from '@playwright/test';

test.describe('Debug Cart Page Scripts', () => {
  test('should render and execute WordPress cart scripts', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Listen for script errors
    const scriptErrors: string[] = [];
    page.on('pageerror', error => {
      scriptErrors.push(error.message);
    });

    // Navigate to cart page
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    console.log('\n=== CART PAGE SCRIPT DEBUG ===\n');

    // 1. Check if HeadScripts rendered any scripts
    const headScripts = await page.locator('head script').count();
    console.log(`Head scripts count: ${headScripts}`);

    const headScriptSrcs = await page.locator('head script[src]').evaluateAll(scripts =>
      scripts.map(s => (s as HTMLScriptElement).src)
    );
    console.log('Head script sources:', headScriptSrcs);

    // 2. Check if BodyScripts rendered any scripts
    const bodyScripts = await page.locator('body script').count();
    console.log(`Body scripts count: ${bodyScripts}`);

    const bodyScriptSrcs = await page.locator('body script[src]').evaluateAll(scripts =>
      scripts.map(s => (s as HTMLScriptElement).src)
    );
    console.log('Body script sources:', bodyScriptSrcs);

    // 3. Check for inline scripts
    const inlineHeadScripts = await page.locator('head script:not([src])').count();
    const inlineBodyScripts = await page.locator('body script:not([src])').count();
    console.log(`Inline head scripts: ${inlineHeadScripts}`);
    console.log(`Inline body scripts: ${inlineBodyScripts}`);

    // 4. Check if WordPress globals are available
    const wpGlobals = await page.evaluate(() => {
      return {
        hasJQuery: typeof (window as any).jQuery !== 'undefined',
        jQueryVersion: (window as any).jQuery?.fn?.jquery,
        hasWC: typeof (window as any).wc !== 'undefined',
        hasWooCommerce: typeof (window as any).woocommerce !== 'undefined',
        hasWcCartFragments: typeof (window as any).wc_cart_fragments_params !== 'undefined',
      };
    });
    console.log('WordPress globals:', wpGlobals);

    // 5. Check specific WooCommerce cart scripts
    const wcScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts
        .map(s => (s as HTMLScriptElement).src)
        .filter(src => src.includes('woocommerce') || src.includes('cart'));
    });
    console.log('WooCommerce cart scripts:', wcScripts);

    // 6. Check for cart fragments functionality
    const cartFragmentsAvailable = await page.evaluate(() => {
      return {
        hasParams: typeof (window as any).wc_cart_fragments_params !== 'undefined',
        hasJQueryBlockUI: typeof (window as any).jQuery?.fn?.block !== 'undefined',
        cartHashElement: document.querySelector('.woocommerce-cart-form') !== null,
      };
    });
    console.log('Cart fragments availability:', cartFragmentsAvailable);

    // 7. Check the actual HTML content
    const cartContent = await page.content();
    const hasCartFragmentsScript = cartContent.includes('cart-fragments');
    const hasWCAddToCartScript = cartContent.includes('wc-add-to-cart');
    console.log('Has cart-fragments in HTML:', hasCartFragmentsScript);
    console.log('Has wc-add-to-cart in HTML:', hasWCAddToCartScript);

    // 8. Print any console messages
    console.log('\nConsole messages:');
    consoleMessages.forEach(msg => console.log(msg));

    // 9. Print any script errors
    if (scriptErrors.length > 0) {
      console.log('\nScript errors:');
      scriptErrors.forEach(err => console.log(err));
    }

    // 10. Check if scripts are actually loading (not 404)
    const failedScripts: string[] = [];
    page.on('response', response => {
      if (response.request().resourceType() === 'script' && !response.ok()) {
        failedScripts.push(`${response.status()} - ${response.url()}`);
      }
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    if (failedScripts.length > 0) {
      console.log('\nFailed script requests:');
      failedScripts.forEach(script => console.log(script));
    }

    console.log('\n=== END DEBUG ===\n');

    // Basic assertions
    expect(headScripts + bodyScripts).toBeGreaterThan(0);
  });

  test('should check cart page DOM after scripts execute', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for scripts to execute
    await page.waitForTimeout(2000);

    // Check if cart content is being dynamically loaded
    const wcBlockCart = await page.locator('.wc-block-cart').count();
    const emptyCartMessage = await page.locator('.wc-block-cart__empty-cart__title').count();

    // Cart page should have either cart content or empty cart message
    expect(wcBlockCart > 0 || emptyCartMessage > 0).toBeTruthy();
  });
});
