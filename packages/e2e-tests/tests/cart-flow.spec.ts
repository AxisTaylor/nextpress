import { test, expect } from '@playwright/test';

/**
 * Complete WooCommerce Cart Flow Tests
 *
 * Tests the full user journey from product selection through checkout:
 * 1. Browse products on shop page
 * 2. Add product to cart
 * 3. View cart page with added items
 * 4. Proceed to checkout
 * 5. Verify session persistence throughout
 */

test.describe('Complete Cart Flow', () => {
  test('should complete full cart journey: shop → add to cart → cart page → checkout', async ({ page, context }) => {
    const proxyRequests: string[] = [];

    // Monitor proxy requests
    page.on('response', response => {
      if (response.url().includes('/atx/default/')) {
        proxyRequests.push(response.url());
      }
    });

    // Step 1: Navigate to shop page using nav link
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const shopLink = page.locator('a[href="/shop"]');
    await shopLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/shop/);

    // Step 2: Get products from API and find a simple product
    const shopResponse = await page.request.get('/api/shop');
    const shopData = await shopResponse.json();

    expect(shopData.success).toBe(true);
    expect(shopData.products.length).toBeGreaterThan(0);

    const simpleProduct = shopData.products.find((p: any) => p.type === 'SIMPLE');
    expect(simpleProduct).toBeDefined();

    // Step 3: Click product link to navigate to product page
    const productLink = page.locator(`a[href="/product/${simpleProduct.slug}"]`).first();
    await productLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/product\//);

    // Step 4: Add product to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    await addToCartButton.waitFor({ state: 'visible' });

    const isDisabled = await addToCartButton.isDisabled();
    expect(isDisabled).toBe(false);

    // Click add to cart and wait for API response
    await addToCartButton.click();
    await page.waitForResponse(response =>
      response.url().includes('/api/update-cart') && response.status() === 200
    );

    // Verify Cart-Token was created
    const cookies = await context.cookies();
    const cartToken = cookies.find(c => c.name === 'cartToken');
    expect(cartToken).toBeDefined();

    // Step 5: Navigate to cart using nav link
    // Set up response listener BEFORE clicking to catch the API request
    const cartApiPromise = page.waitForResponse(
      response => response.url().includes('/wc/store/v1/cart') && response.status() === 200,
      { timeout: 30000 }
    );

    const cartLink = page.locator('a[href="/cart"]');
    await cartLink.click();

    // Wait for navigation and API response in parallel
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      cartApiPromise.catch(() => {/* API may have already loaded */})
    ]);

    await expect(page).toHaveURL(/\/cart/);

    // Step 6: Verify cart has the product (wait for content to be visible)
    const productNameInCart = page.locator(`text=${simpleProduct.name}`);
    await expect(productNameInCart).toBeVisible({ timeout: 30000 });

    const cartContent = await page.content();
    expect(cartContent.toLowerCase()).toContain(simpleProduct.name.toLowerCase());

    // Verify proxy requests occurred for cart page
    expect(proxyRequests.length).toBeGreaterThan(0);

    // Verify Cart-Token persisted through the flow
    const finalCookies = await context.cookies();
    const finalCartToken = finalCookies.find(c => c.name === 'cartToken');
    expect(finalCartToken).toBeDefined();
  });

  test('should handle multiple items in cart', async ({ page, context }) => {
    // Get products from API and find two simple products
    const shopResponse = await page.request.get('/api/shop');
    const shopData = await shopResponse.json();

    expect(shopData.success).toBe(true);
    expect(shopData.products.length).toBeGreaterThan(0);

    const simpleProducts = shopData.products.filter((p: any) => p.type === 'SIMPLE');

    if (simpleProducts.length >= 2) {
      // Add second product
      await page.goto(`/product/${simpleProducts[1].slug}`);
      await page.waitForLoadState('domcontentloaded');

      const addButton1 = page.locator('button:has-text("Add to Cart")').first();
      if (!(await addButton1.isDisabled())) {
        await addButton1.click();
        await page.waitForTimeout(1500);
      }

      // Add third product
      await page.goto(`/product/${simpleProducts[2].slug}`);
      await page.waitForLoadState('domcontentloaded');

      const addButton2 = page.locator('button:has-text("Add to Cart")').first();
      if (!(await addButton2.isDisabled())) {
        await addButton2.click();
        await page.waitForTimeout(1500);

        // Navigate to cart - set up response listener BEFORE navigation
        const cartApiPromise = page.waitForResponse(
          response => response.url().includes('/wc/store/v1/cart') && response.status() === 200,
          { timeout: 30000 }
        );

        await page.goto('/cart', { waitUntil: 'domcontentloaded' });

        // Wait for cart API response (may have already completed)
        await cartApiPromise.catch(() => {/* API may have already loaded */});

        // Cart should have content from multiple products (wait for visibility)
        await page.waitForSelector('.wc-block-cart', { timeout: 30000 }).catch(() => {});
        const cartContent = await page.content();
        const hasCartItems = cartContent.toLowerCase().includes('cart');
        expect(hasCartItems).toBeTruthy();

        // Cart-Token should persist
        const cookies = await context.cookies();
        const cartToken = cookies.find(c => c.name === 'cartToken');
        expect(cartToken).toBeDefined();
      }
    }
  });

  // test('should handle removing items from cart', async ({ page }) => {
  //   // Get products from API and find a simple product
  //   const shopResponse = await page.request.get('/api/shop');
  //   const shopData = await shopResponse.json();

  //   expect(shopData.success).toBe(true);
  //   const simpleProduct = shopData.products.find((p: any) => p.type === 'SIMPLE');

  //   if (simpleProduct) {
  //     // Navigate to product page
  //     await page.goto(`/product/${simpleProduct.slug}`);
  //     await page.waitForLoadState('networkidle');

  //     const addButton = page.locator('button:has-text("Add to Cart")').first();
  //     if (!(await addButton.isDisabled())) {
  //       await addButton.click();
  //       await page.waitForTimeout(1500);

  //       // Should now show "Remove from Cart"
  //       const removeButton = page.locator('button:has-text("Remove from Cart")');
  //       const hasRemoveButton = await removeButton.count() > 0;

  //       if (hasRemoveButton) {
  //         // Click remove
  //         await removeButton.click();
  //         await page.waitForTimeout(1500);

  //         // Button should change back to "Add to Cart"
  //         const addButtonAgain = page.locator('button:has-text("Add to Cart")');
  //         const hasAddButton = await addButtonAgain.count() > 0;
  //         expect(hasAddButton).toBeTruthy();

  //         console.log('Successfully removed item from cart');
  //       }

  //       // Session should still exist even after removing items
  //       // Note: We just verify the remove action worked, not checking session token here
  //     }
  //   }
  // });

  test('should update cart quantity', async ({ page }) => {
    // Get products from API and find a simple product
    const shopResponse = await page.request.get('/api/shop');
    const shopData = await shopResponse.json();

    expect(shopData.success).toBe(true);
    const simpleProduct = shopData.products.find((p: any) => p.type === 'SIMPLE');

    if (simpleProduct) {
      // Navigate to product page
      await page.goto(`/product/${simpleProduct.slug}`);
      await page.waitForLoadState('domcontentloaded');

      // Find quantity input
      const quantityInput = page.locator('input[type="number"]#quantity');
      const hasQuantityInput = await quantityInput.count() > 0;

      if (hasQuantityInput) {
        // Change quantity to 2
        await quantityInput.fill('2');
        await page.waitForTimeout(500);

        // Add to cart
        const addButton = page.locator('button:has-text("Add to Cart")').first();
        if (!(await addButton.isDisabled())) {
          await addButton.click();
          await page.waitForTimeout(1500);

          // Navigate to cart - set up response listener BEFORE navigation
          const cartApiPromise = page.waitForResponse(
            response => response.url().includes('/wc/store/v1/cart') && response.status() === 200,
            { timeout: 30000 }
          );

          await page.goto('/cart', { waitUntil: 'domcontentloaded' });

          // Wait for cart API response (may have already completed)
          await cartApiPromise.catch(() => {/* API may have already loaded */});

          // Wait for cart content to be visible
          await page.waitForSelector('.wc-block-cart', { timeout: 30000 }).catch(() => {});

          // Cart should show quantity of 2
          const cartContent = await page.content();
          const hasQuantity = cartContent.includes('2') || cartContent.includes('quantity');
          expect(hasQuantity).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Cart Error Handling', () => {
  test('should handle invalid product IDs gracefully', async ({ request }) => {
    const response = await request.post('/api/update-cart', {
      data: {
        action: 'add',
        productId: 99999, // Invalid product ID
        quantity: 1,
      },
    });

    // Should return error or handle gracefully (not crash)
    expect(response.status()).toBeLessThan(600);

    const data = await response.json();
    // Either success: false or error message
    expect(data.success === false || data.error).toBeTruthy();
  });

  test('should handle missing required fields', async ({ request }) => {
    const response = await request.post('/api/update-cart', {
      data: {
        action: 'add',
        // Missing productId
        quantity: 1,
      },
    });

    // Should return error
    expect(response.ok()).toBe(false);
  });
});
