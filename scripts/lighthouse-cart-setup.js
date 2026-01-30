/**
 * Lighthouse CI puppeteer prescript
 *
 * Seeds the cart with a product before Lighthouse audits /cart/ and /checkout/.
 * The browser stays open across all URLs, so cookies set here persist
 * for subsequent Lighthouse runs.
 */

const BASE_URL = 'http://localhost:3000';

let cartSeeded = false;

module.exports = async (browser, context) => {
  // Only seed cart before cart/checkout URLs, and only once
  if (cartSeeded || (!context.url.includes('/cart') && !context.url.includes('/checkout'))) {
    return;
  }

  const page = await browser.newPage();
  try {
    // Fetch product list from the shop API
    const shopResponse = await page.goto(`${BASE_URL}/api/shop`, {
      waitUntil: 'networkidle0',
    });
    const shopData = await page.evaluate(() => JSON.parse(document.body.innerText));

    const simpleProduct = shopData.products.find((p) => p.type === 'SIMPLE');
    if (!simpleProduct) {
      console.warn('[Lighthouse prescript] No simple product found, skipping cart setup');
      return;
    }

    // Navigate to the product page
    await page.goto(`${BASE_URL}/product/${simpleProduct.slug}`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for and click the "Add to Cart" button
    await page.waitForSelector('button');
    const added = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find((b) => b.textContent.includes('Add to Cart') && !b.disabled);
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });

    if (!added) {
      console.warn('[Lighthouse prescript] Could not find Add to Cart button');
      return;
    }

    // Wait for the cart API response to confirm the item was added
    await page.waitForResponse(
      (response) => response.url().includes('/api/update-cart') && response.status() === 200,
    );

    cartSeeded = true;
  } finally {
    await page.close();
  }
};
