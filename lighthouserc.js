module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/shop/',
        'http://localhost:3000/cart/',
        'http://localhost:3000/checkout/',
      ],
      numberOfRuns: 3,
      // Seed the cart with a product before auditing cart/checkout pages
      puppeteerScript: './scripts/lighthouse-cart-setup.js',
      // Both servers must be running before Lighthouse starts
      // Use `npm run dev` to start both, or start them manually
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 180000, // 3 minutes for WordPress backend + Next.js
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
        // Disable checks that don't apply to dev environment
        'uses-http2': 'off',
        'uses-long-cache-ttl': 'off',
        'redirects-http': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
