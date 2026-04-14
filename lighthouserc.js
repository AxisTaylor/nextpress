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
        'bf-cache': 'off',

        // WordPress core ships legacy JS (jQuery etc.) and unused
        // CSS/JS from global theme enqueues — not in our control.
        'legacy-javascript': 'warn',
        'legacy-javascript-insight': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',

        // Font display is controlled by the WP theme.
        'font-display': 'warn',
        'font-display-insight': 'warn',

        // Network/render insights are informational — WP script
        // loading order is dictated by WordPress dependency system.
        'network-dependency-tree-insight': 'warn',
        'render-blocking-insight': 'warn',
        'render-blocking-resources': 'warn',

        // Image optimization — next/image handles this in the example
        // app but WP content images may not all be optimized.
        'uses-responsive-images': 'warn',
        'image-delivery-insight': 'warn',
        'modern-image-formats': 'warn',
        'unsized-images': 'warn',

        // LCP insights — affected by WP script loading and image
        // optimization pipeline which varies by deployment.
        'lcp-discovery-insight': 'warn',
        'lcp-lazy-loaded': 'warn',

        // Third-party concerns — Stripe, WC blocks, analytics.
        'errors-in-console': 'warn',
        'inspector-issues': 'warn',
        'third-party-cookies': 'warn',
        'total-byte-weight': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
