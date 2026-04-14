module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/shop',
        'http://localhost:3000/cart',
        'http://localhost:3000/checkout',
      ],
      numberOfRuns: 3,
      // Seed the cart with a product before auditing cart/checkout pages
      puppeteerScript: './scripts/lighthouse-cart-setup.js',
      // WordPress backend must be running before Lighthouse starts.
      // Next.js example must be built first: npm run build:example
      startServerCommand: 'npm run serve:nextjs-example',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
    },
    assert: {
      // No preset — only assert on the scores and vitals we control.
      // Individual audit results are still visible in the report but
      // won't fail CI. The checkout page loads Stripe + WC Blocks which
      // tanks many audits that aren't actionable from NextPress.
      assertions: {
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 5000 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.15 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
