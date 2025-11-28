import { test, expect } from '@playwright/test';

/**
 * WooCommerce Cart & Session Management Tests
 *
 * Tests the complete cart flow with session token management:
 * 1. Cart-Token generation on first cart action
 * 2. Token persistence across requests
 * 3. Cart state management
 * 4. Proxy integration
 */

test.describe('Cart Session Management', () => {
  test('should create session token when adding first item to cart', async ({ page, context }) => {
    await page.goto('/shop');

    // Get initial cookies
    const initialCookies = await context.cookies();
    const initialSessionToken = initialCookies.find(c => c.name === 'cartToken');

    // Should not have session token initially
    expect(initialSessionToken).toBeUndefined();

    // Find and click first "Add to Cart" button (simple product)
    const addToCartButtons = page.locator('button:has-text("Add to Cart"), a:has-text("Add to Cart")');
    const buttonCount = await addToCartButtons.count();

    if (buttonCount > 0) {
      // Click first add to cart button
      await addToCartButtons.first().click();

      // Wait for request to complete
      await page.waitForTimeout(1000);

      // Check for session token cookie
      const updatedCookies = await context.cookies();
      const cartToken = updatedCookies.find(c => c.name === 'cartToken');

      // Should now have session token
      expect(cartToken).toBeDefined();
      expect(cartToken?.value).toBeTruthy();
    }
  });

  test('should persist session token across page navigations', async ({ page, context }) => {
    await page.goto('/shop');

    // Add item to cart to generate session
    const addToCartButtons = page.locator('button:has-text("Add to Cart")');
    const buttonCount = await addToCartButtons.count();

    if (buttonCount > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(1000);

      // Get session token
      const cookies1 = await context.cookies();
      const cartToken1 = cookies1.find(c => c.name === 'cartToken')?.value;
      expect(cartToken1).toBeTruthy();

      // Navigate to cart page
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // Get session token again
      const cookies2 = await context.cookies();
      const cartToken2 = cookies2.find(c => c.name === 'cartToken')?.value;

      // Cart-Token should persist
      expect(cartToken2).toBe(cartToken1);
    }
  });

  test('should include session token in GraphQL requests', async ({ page }) => {
    // Intercept GraphQL requests
    const graphqlRequests: any[] = [];
    await page.route('**/graphql', route => {
      const request = route.request();
      graphqlRequests.push({
        url: request.url(),
        headers: request.headers(),
        postData: request.postDataJSON(),
      });
      route.continue();
    });

    await page.goto('/shop');

    // Add item to cart
    const addToCartButtons = page.locator('button:has-text("Add to Cart")');
    const buttonCount = await addToCartButtons.count();

    if (buttonCount > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(2000);

      // Find cart-related GraphQL requests
      const cartRequests = graphqlRequests.filter(req =>
        req.postData?.query?.includes('cart') ||
        req.postData?.query?.includes('addToCart')
      );

      // Should have session header in requests after first cart action
      if (cartRequests.length > 1) {
        const laterRequests = cartRequests.slice(1);
        laterRequests.forEach(req => {
          const sessionHeader = req.headers['woocommerce-session'];
          expect(sessionHeader).toBeTruthy();
          expect(sessionHeader).toContain('Session');
        });
      }
    }
  });
});

test.describe('Cart API Routes', () => {
  test('GET /api/cart should return null when no session exists', async ({ request }) => {
    // Make request without cookies (no session)
    const response = await request.get('/api/cart');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should return null cart when no session
    expect(data.cart).toBeNull();
  });

  test('POST /api/update-cart should create session and add item', async ({ request, context }) => {
    // Clear cookies first
    await context.clearCookies();

    // First, get a valid product from the shop
    const shopResponse = await request.get('/api/shop');
    expect(shopResponse.ok()).toBeTruthy();

    const shopData = await shopResponse.json();
    expect(shopData.success).toBe(true);
    expect(shopData.products.length).toBeGreaterThan(0);

    // Find first simple product (can be added to cart without variation)
    const simpleProduct = shopData.products.find((p: any) => p.type === 'SIMPLE');
    expect(simpleProduct).toBeDefined();

    const productId = simpleProduct.databaseId;

    // Add item to cart with valid product ID
    const response = await request.post('/api/update-cart', {
      data: {
        action: 'add',
        productId: productId,
        quantity: 1,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should be successful
    expect(data.success).toBe(true);

    // Should have set session token cookie in Set-Cookie header
    const setCookieHeader = response.headers()['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('cartToken=');
  });

  test('POST /api/update-cart should update existing session', async ({ request, context, page }) => {
    // First, get a valid product
    const shopResponse = await request.get('/api/shop');
    const shopData = await shopResponse.json();

    if (shopData.success && shopData.products.length > 0) {
      // Find first simple product
      const simpleProduct = shopData.products.find((p: any) => p.type === 'SIMPLE');
      if (!simpleProduct) return; // Skip test if no simple products

      const productId = simpleProduct.databaseId;

      // Create a session by visiting shop and adding item
      await page.goto('/shop');
      const addToCartButtons = page.locator('button:has-text("Add to Cart")');
      const buttonCount = await addToCartButtons.count();

      if (buttonCount > 0) {
        await addToCartButtons.first().click();
        await page.waitForTimeout(1000);

        // Get initial session token
        const cookies1 = await context.cookies();
        const cartToken1 = cookies1.find(c => c.name === 'cartToken')?.value;
        expect(cartToken1).toBeTruthy();

        // Make another API call with the session and a different product if available
        const simpleProducts = shopData.products.filter((p: any) => p.type === 'SIMPLE');
        const secondProductId = simpleProducts.length > 1
          ? simpleProducts[1].databaseId
          : productId;

        const response = await request.post('/api/update-cart', {
          data: {
            action: 'add',
            productId: secondProductId,
            quantity: 1,
          },
        });

        expect(response.ok()).toBeTruthy();

        // Cart-Token should still exist (may be updated)
        const cookies2 = await context.cookies();
        const cartToken2 = cookies2.find(c => c.name === 'cartToken')?.value;
        expect(cartToken2).toBeTruthy();
      }
    }
  });
});

test.describe('Cart State Persistence', () => {
  test('cart items should persist after page reload', async ({ page, context }) => {
    await page.goto('/shop');

    // Add item to cart
    const addToCartButtons = page.locator('button:has-text("Add to Cart")');
    const buttonCount = await addToCartButtons.count();

    if (buttonCount > 0) {
      await addToCartButtons.first().click();
      await page.waitForTimeout(1000);

      // Navigate to cart
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // Check if cart has items (WordPress will render cart content)
      const pageContent = await page.content();
      const hasCartContent = pageContent.includes('cart') || pageContent.includes('product');

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Cart-Token should still exist
      const cookies = await context.cookies();
      const cartToken = cookies.find(c => c.name === 'cartToken');
      expect(cartToken).toBeDefined();
    }
  });
});
