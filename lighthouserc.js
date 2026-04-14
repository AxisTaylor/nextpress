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
        // Core score thresholds
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],

        // Disabled — not applicable to localhost
        'uses-http2': 'off',
        'redirects-http': 'off',

        // Back/forward cache is affected by Next.js internals and
        // third-party scripts (Stripe) — not actionable.
        'bf-cache': 'off',

        // Image optimization requires next/image or a CDN — out of
        // scope for the example app.
        'uses-responsive-images': 'warn',
        'image-delivery-insight': 'warn',
        'modern-image-formats': 'warn',

        // Console errors from third-party scripts (Stripe, WC blocks)
        // are not actionable from NextPress.
        'errors-in-console': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
