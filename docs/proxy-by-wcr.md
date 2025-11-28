# proxyByWCR

`proxyByWCR` is a middleware function that proxies requests to WordPress backends. It handles REST API calls, AJAX requests, WooCommerce endpoints, and asset requests.

## Basic Usage (Next.js 16+)

```ts
// proxy.ts
import { NextResponse, NextRequest } from 'next/server';
import { proxyByWCR, isProxiedRoute } from '@axistaylor/nextpress/proxyByWCR';

export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // Proxy WordPress API routes
  if (isProxiedRoute(pathname)) {
    return proxyByWCR(request);
  }

  // For page routes, pass through with x-uri header
  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({
    request: { headers },
  });
};

export const config = {
  matcher: [
    // WordPress API routes
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-json/:path*',
    '/atx/:instance/wp-assets/:path*',
    '/atx/:instance/wp-internal-assets/:path*',
    // Page routes (for x-uri header)
    '/((?!_next|api|favicon.ico|.*\\.).*)',
  ],
};
```

## Exports

### proxyByWCR

Main proxy function that handles WordPress requests.

```ts
function proxyByWCR(request: NextRequest): Promise<Response>
```

### isProxiedRoute

Helper to check if a path should be proxied.

```ts
function isProxiedRoute(pathname: string): boolean
```

Returns `true` for paths matching:
- `/atx/:instance/wp-json/*`
- `/atx/:instance/wp`
- `/atx/:instance/wc`
- `/atx/:instance/wp-assets/*`
- `/atx/:instance/wp-internal-assets/*`

## Route Patterns

The proxy handles these route patterns:

| Pattern | Description |
|---------|-------------|
| `/atx/:instance/wp-json/*` | WordPress REST API |
| `/atx/:instance/wp` | WordPress admin-ajax.php |
| `/atx/:instance/wc` | WooCommerce AJAX |
| `/atx/:instance/wp-assets/*` | Public WordPress assets |
| `/atx/:instance/wp-internal-assets/*` | Internal WordPress assets |

The `:instance` parameter is the WordPress instance slug (e.g., `default`, `blog`, `shop`).

## Matcher Configuration

**Critical**: The proxy only runs for routes in the `matcher` array.

```ts
export const config = {
  matcher: [
    // Required: WordPress API routes
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-json/:path*',
    '/atx/:instance/wp-assets/:path*',
    '/atx/:instance/wp-internal-assets/:path*',

    // Required for layouts: Page routes to set x-uri header
    // Excludes static files and Next.js internals
    '/((?!_next|api|favicon.ico|.*\\.).*)',
  ],
};
```

## WooCommerce Cart-Token Handling

For WooCommerce stores, you need to handle the Cart-Token header for cart persistence:

```ts
// proxy.ts
export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (isProxiedRoute(pathname)) {
    // Get existing Cart-Token from cookies
    const cartToken = request.cookies.get('cartToken')?.value;

    // Add Cart-Token to request headers
    if (cartToken) {
      request.headers.set('Cart-Token', cartToken);
    }

    // Proxy request
    const response = await proxyByWCR(request);

    // Check for updated Cart-Token in response
    const updatedCartToken = response.headers.get('Cart-Token');

    if (updatedCartToken) {
      // Create new response with cookie
      const nextResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Set Cart-Token cookie
      nextResponse.cookies.set({
        name: 'cartToken',
        value: updatedCartToken,
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      });

      return nextResponse;
    }

    return response;
  }

  // Page routes
  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({
    request: { headers },
  });
};
```

## Authentication Handling

For authenticated WordPress requests:

```ts
export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (isProxiedRoute(pathname)) {
    // Get auth token from cookies
    const authToken = request.cookies.get('authToken')?.value;

    if (authToken) {
      request.headers.set('Authorization', `Bearer ${authToken}`);
    }

    return proxyByWCR(request);
  }

  // ...
};
```

## Multi-WordPress Support

The proxy automatically routes to the correct WordPress instance based on the URL pattern:

```
/atx/default/wp-json/wp/v2/posts  → default instance
/atx/blog/wp-json/wp/v2/posts    → blog instance
/atx/shop/wc?wc-ajax=add_to_cart → shop instance
```

Instance configuration comes from `withWCR`:

```js
// next.config.mjs
export default withWCR(nextConfig, {
  instances: {
    default: { wpDomain: 'main.example.com', wpProtocol: 'https' },
    blog: { wpDomain: 'blog.example.com', wpProtocol: 'https' },
    shop: { wpDomain: 'shop.example.com', wpProtocol: 'https' },
  },
  // ...
});
```

## Error Handling

The proxy returns appropriate error responses:

| Status | Condition |
|--------|-----------|
| 404 | WordPress instance not found |
| 502 | WordPress backend unreachable |
| *varies* | Proxied response status |

## TypeScript

```ts
import { proxyByWCR, isProxiedRoute } from '@axistaylor/nextpress/proxyByWCR';
import { NextRequest, NextResponse } from 'next/server';
```

## Troubleshooting

### Proxy Not Working

1. **Check matcher** - Ensure routes are in the matcher array
2. **Check instance** - Verify instance slug matches `withWCR` config
3. **Check WordPress** - Ensure WordPress is accessible

### CORS Errors

Configure CORS in the NextPress WordPress plugin settings or use the filter:

```php
add_filter('nextpress_cors_allowed_origins', function($origins) {
  $origins[] = 'https://your-frontend.com';
  return $origins;
});
```

### Cart Not Persisting

Ensure Cart-Token handling is implemented (see WooCommerce section above).

## Related

- [withWCR](./with-wcr.md) - Next.js configuration
- [HeadScripts](./head-scripts.md) - URI retrieval in layouts
- [Multi-WordPress Setup](./multi-wordpress.md) - Multiple backends
- [Troubleshooting](./troubleshooting.md) - Common issues
