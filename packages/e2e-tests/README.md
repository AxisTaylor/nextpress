# NextPress E2E Tests

End-to-end tests for NextPress using Playwright.

## Purpose

These tests validate the full NextPress stack:

1. **React Server Components** - RenderStylesheets, HeadScripts, BodyScripts (cannot be unit tested)
2. **WordPress Integration** - Content rendering, asset loading, middleware proxy
3. **User Flows** - Page rendering, WooCommerce cart/checkout, authentication
4. **Multi-WordPress** - Instance routing and configuration

## Prerequisites

Before running tests:

1. **WordPress Backend** must be running on port 8080:
   ```bash
   npm run dev:wp-backend
   ```

2. **Next.js Frontend** must be running on port 3000:
   ```bash
   npm run dev:wp-frontend
   ```

## Running Tests

### From Root Directory

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Run tests in Playwright UI mode (recommended for development)
npm run test:e2e:ui

# Debug specific test
npm run test:e2e:debug
```

### From e2e-tests Package

```bash
cd packages/e2e-tests

# Run all tests
npm test

# Run with visible browser
npm run test:headed

# Run in UI mode
npm run test:ui

# Debug mode
npm run test:debug

# Generate test code
npm run test:codegen
```

## Test Organization

```
tests/
├── smoke.spec.ts           # Basic smoke tests
├── rsc-components.spec.ts  # React Server Component tests (critical!)
├── page-rendering.spec.ts  # WordPress page rendering
├── woocommerce.spec.ts     # Cart, checkout, products
├── assets.spec.ts          # Asset loading and proxy
└── multi-wordpress.spec.ts # Multi-instance routing
```

## Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Expected Text');
});
```

## Key Test Scenarios

### RSC Components (Priority 1)

These tests validate React Server Components that **cannot** be tested with Jest:

- **RenderStylesheets**: Verify stylesheets load in correct order, inline styles, URL proxying
- **HeadScripts/BodyScripts**: Verify script placement, dependencies, loading strategies, wp-api-fetch refactoring

### WordPress Integration

- Content rendering with Gutenberg blocks
- Asset loading without 404s
- Middleware proxy routing
- AJAX requests (WordPress and WooCommerce)

### User Flows

- Page navigation
- WooCommerce cart operations
- Checkout process
- Authentication

## Debugging

### View Test Report

```bash
npm run report
```

### Enable Trace Viewer

Tests automatically capture traces on failure. View them:

```bash
npx playwright show-trace path/to/trace.zip
```

### Screenshots and Videos

- Screenshots: Captured on failure
- Videos: Captured on failure (retained)
- Location: `test-results/` directory

## CI/CD

Tests are configured for CI with:
- Automatic retries (2x)
- Sequential execution
- No server auto-start (must be started separately)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
