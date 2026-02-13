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
      startServerReadyTimeout: 30000, // 30 seconds for production server startup
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        // Disable checks that don't apply to localhost testing
        'uses-http2': 'off',
        'redirects-http': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
