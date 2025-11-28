import { test, expect } from '@playwright/test';

/**
 * Proxy Middleware Tests
 *
 * Tests the proxyByWCR middleware functionality by navigating to real WordPress pages
 * and verifying that proxied requests are handled correctly:
 * 1. WordPress REST API proxying
 * 2. WooCommerce AJAX proxying
 * 3. WordPress AJAX proxying
 * 4. Asset proxying (wp-assets, wp-internal-assets)
 * 5. Cart-Token handling
 */

test.describe('Home Page Proxy', () => {
  test('should successfully load home page with all proxied assets', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number | null; error: string | null }> = [];
    const proxyRequests: Array<{ url: string; status: number }> = [];

    // Monitor all requests
    page.on('response', response => {
      const url = response.url();

      // Track proxy requests
      if (url.includes('/api/default/')) {
        proxyRequests.push({
          url,
          status: response.status(),
        });

        // Track failures
        if (!response.ok()) {
          failedRequests.push({
            url,
            status: response.status(),
            error: response.statusText(),
          });
        }
      }
    });

    page.on('requestfailed', request => {
      if (request.url().includes('/api/default/')) {
        failedRequests.push({
          url: request.url(),
          status: null,
          error: request.failure()?.errorText || 'Unknown error',
        });
      }
    });

    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded
    await expect(page).toHaveURL('/');

    // All proxy requests should succeed
    if (failedRequests.length > 0) {
      console.log('Failed proxy requests:', failedRequests);
    }
    expect(failedRequests.length).toBe(0);

    console.log(`Home page loaded with ${proxyRequests.length} successful proxy requests`);
  });

  test('should proxy WordPress internal assets (wp-internal-assets)', async ({ page }) => {
    const internalAssets: Array<{ url: string; status: number; type: string }> = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/default/wp-internal-assets/')) {
        internalAssets.push({
          url,
          status: response.status(),
          type: response.request().resourceType(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // If internal assets were loaded, they should all succeed
    const failedAssets = internalAssets.filter(asset => asset.status >= 400);

    if (failedAssets.length > 0) {
      console.log('Failed internal assets:', failedAssets);
    }
    expect(failedAssets.length).toBe(0);

    if (internalAssets.length > 0) {
      console.log(`Loaded ${internalAssets.length} internal assets successfully`);
    }
  });

  test('should proxy WordPress content assets (wp-assets)', async ({ page }) => {
    const contentAssets: Array<{ url: string; status: number; type: string }> = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/default/wp-assets/')) {
        contentAssets.push({
          url,
          status: response.status(),
          type: response.request().resourceType(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // If content assets were loaded, they should all succeed
    const failedAssets = contentAssets.filter(asset => asset.status >= 400);

    if (failedAssets.length > 0) {
      console.log('Failed content assets:', failedAssets);
    }
    expect(failedAssets.length).toBe(0);

    if (contentAssets.length > 0) {
      console.log(`Loaded ${contentAssets.length} content assets successfully`);
    }
  });
});

test.describe('Shop Page Proxy', () => {
  test('should successfully load shop page with all proxied requests', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number | null; error: string | null }> = [];
    const proxyRequests: Array<{ url: string; status: number }> = [];

    page.on('response', response => {
      const url = response.url();

      if (url.includes('/api/default/')) {
        proxyRequests.push({
          url,
          status: response.status(),
        });

        if (!response.ok()) {
          failedRequests.push({
            url,
            status: response.status(),
            error: response.statusText(),
          });
        }
      }
    });

    page.on('requestfailed', request => {
      if (request.url().includes('/api/default/')) {
        failedRequests.push({
          url: request.url(),
          status: null,
          error: request.failure()?.errorText || 'Unknown error',
        });
      }
    });

    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/shop');

    if (failedRequests.length > 0) {
      console.log('Failed proxy requests on shop page:', failedRequests);
    }
    expect(failedRequests.length).toBe(0);

    console.log(`Shop page loaded with ${proxyRequests.length} successful proxy requests`);
  });
});

test.describe('Product Page Proxy', () => {
  test('should successfully load product page with all proxied requests', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number | null; error: string | null }> = [];
    const proxyRequests: Array<{ url: string; status: number }> = [];

    page.on('response', response => {
      const url = response.url();

      if (url.includes('/api/default/')) {
        proxyRequests.push({
          url,
          status: response.status(),
        });

        if (!response.ok()) {
          failedRequests.push({
            url,
            status: response.status(),
            error: response.statusText(),
          });
        }
      }
    });

    page.on('requestfailed', request => {
      if (request.url().includes('/api/default/')) {
        failedRequests.push({
          url: request.url(),
          status: null,
          error: request.failure()?.errorText || 'Unknown error',
        });
      }
    });

    // First navigate to shop to get a product
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');

    // Find and click first product link
    const productLinks = page.locator('[href*="/product/"]');
    const productCount = await productLinks.count();

    if (productCount > 0) {
      await productLinks.first().click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/product\//);

      if (failedRequests.length > 0) {
        console.log('Failed proxy requests on product page:', failedRequests);
      }
      expect(failedRequests.length).toBe(0);

      console.log(`Product page loaded with ${proxyRequests.length} successful proxy requests`);
    } else {
      console.log('No products found to test product page');
    }
  });
});

test.describe('Cart Page Proxy', () => {
  test('should successfully load cart page with all proxied requests', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number | null; error: string | null }> = [];
    const proxyRequests: Array<{ url: string; status: number }> = [];

    page.on('response', response => {
      const url = response.url();

      if (url.includes('/api/default/')) {
        proxyRequests.push({
          url,
          status: response.status(),
        });

        if (!response.ok()) {
          failedRequests.push({
            url,
            status: response.status(),
            error: response.statusText(),
          });
        }
      }
    });

    page.on('requestfailed', request => {
      if (request.url().includes('/api/default/')) {
        failedRequests.push({
          url: request.url(),
          status: null,
          error: request.failure()?.errorText || 'Unknown error',
        });
      }
    });

    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL('/cart');

    if (failedRequests.length > 0) {
      console.log('Failed proxy requests on cart page:', failedRequests);
    }
    expect(failedRequests.length).toBe(0);

    console.log(`Cart page loaded with ${proxyRequests.length} successful proxy requests`);
  });
});

test.describe('Session Token Proxy Management', () => {
  test('should create and manage session tokens through add-to-cart flow', async ({ page, context }) => {
    await context.clearCookies();

    const proxyRequests: Array<{ url: string; hasSessionHeader: boolean; status: number }> = [];
    page.on('console', msg => console.log(msg));

    page.on('response', response => {
      const url = response.url();

      if (url.includes('/api/default/')) {
        const requestHeaders = response.request().headers();
        proxyRequests.push({
          url,
          hasSessionHeader: 'woocommerce-session' in requestHeaders,
          status: response.status(),
        });
      }
    });

    // Navigate to shop page
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');

    // Verify no session token initially
    const initialCookies = await context.cookies();
    const initialSessionToken = initialCookies.find(c => c.name === 'cartToken');
    expect(initialSessionToken).toBeUndefined();

    // Get products from API and find a simple product
    const shopResponse = await page.request.get('/api/shop');
    const shopData = await shopResponse.json();

    if (shopData.success && shopData.products.length > 0) {
      const simpleProduct = shopData.products.find((p: any) => p.type === 'SIMPLE');

      if (simpleProduct) {
        // Navigate to the simple product page
        await page.goto(`/product/${simpleProduct.slug}`);
        await page.waitForLoadState('domcontentloaded');

      // Clear proxy requests from navigation
      proxyRequests.length = 0;

      // Click add to cart
      const addButton = page.locator('button:has-text("Add to Cart")').first();
      const isDisabled = await addButton.isDisabled();

      if (!isDisabled) {
        // Wait for the update-cart API response
        const responsePromise = page.waitForResponse(response =>
          response.url().includes('/api/update-cart') && response.status() === 200
        );

        await addButton.click();
        const updateCartResponse = await responsePromise;

        // Debug: Log all response headers
        console.log('[DEBUG] All headers from /api/update-cart:', JSON.stringify(updateCartResponse.headers(), null, 2));
        console.log('[DEBUG] Body from /api/update-cart:', JSON.stringify(await updateCartResponse.json(), null, 2));
        // Check that the response sets the session token cookie
        const cookies = await context.cookies();
        const cartToken = cookies.find(c => c.name === 'cartToken');
        expect(cartToken).toBeDefined();

        console.log('Cart-Token created after add to cart');

        // Navigate to cart page
        await page.goto('/cart');
        await page.waitForLoadState('domcontentloaded');

        // Wait for cart to load
        await page.waitForSelector('.wc-block-cart', { timeout: 10000 }).catch(() => {});

        // Check if subsequent requests include session token
        const requestsWithSession = proxyRequests.filter(req => req.hasSessionHeader);

        if (requestsWithSession.length > 0) {
          console.log(`${requestsWithSession.length} proxy requests included session token`);
        }

        // All proxy requests should succeed
        const failedRequests = proxyRequests.filter(req => req.status >= 400);
        expect(failedRequests.length).toBe(0);
      } else {
        console.log('Add to cart button was disabled - skipping session test');
      }
    } else {
      console.log('No simple products found to test session token management');
    }
  } else {
      console.log('Failed to fetch products from API');
    }
  });
});

test.describe('WordPress REST API Proxy', () => {
  test('should proxy WordPress REST API requests on page load', async ({ page }) => {
    const wpJsonRequests: Array<{ url: string; status: number }> = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/default/wp-json/')) {
        wpJsonRequests.push({
          url,
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // If REST API requests were made, they should succeed
    const failedRequests = wpJsonRequests.filter(req => req.status >= 400);

    if (failedRequests.length > 0) {
      console.log('Failed wp-json requests:', failedRequests);
    }
    expect(failedRequests.length).toBe(0);

    if (wpJsonRequests.length > 0) {
      console.log(`${wpJsonRequests.length} WordPress REST API requests proxied successfully`);
    }
  });
});

test.describe('Proxy Error Handling', () => {
  test('should not have proxy-related JavaScript errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Should not have proxy-related errors
    const hasProxyErrors = [...consoleErrors, ...pageErrors].some(err =>
      err.toLowerCase().includes('proxy') ||
      err.includes('ECONNREFUSED') ||
      err.includes('/api/default/')
    );

    if (hasProxyErrors) {
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors);
    }

    expect(hasProxyErrors).toBe(false);
  });
});
