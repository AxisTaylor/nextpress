# Troubleshooting

Common issues and solutions when using NextPress.

## Proxy Not Working

### Symptoms
- WordPress REST API calls fail
- WooCommerce cart doesn't update
- AJAX requests return 404

### Solutions

**1. Check middleware matcher**

The proxy only runs for routes in the matcher. Ensure your `proxy.ts` includes:

```ts
export const config = {
  matcher: [
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-json/:path*',
    '/atx/:instance/wp-assets/:path*',
    '/atx/:instance/wp-internal-assets/:path*',
  ],
};
```

**2. Verify instance configuration**

Check that instance slugs in URLs match your `withWCR` config:

```js
// next.config.mjs
export default withWCR(nextConfig, {
  instances: {
    default: { wpDomain: 'example.com', wpProtocol: 'https' },
  },
  // ...
});
```

**3. Check WordPress accessibility**

Verify WordPress is reachable from your Next.js server:

```bash
curl https://your-wordpress.com/wp-json/wp/v2/posts
```

## CORS Errors

### Symptoms
- Browser console shows "Access-Control-Allow-Origin" errors
- GraphQL requests blocked
- REST API calls fail from browser

### Solutions

**1. Enable CORS in NextPress settings**

Navigate to **Settings > NextPress** in WordPress admin:
- Enable "Enable CORS"
- Add your frontend URL to "Allowed Origins" (e.g., `https://mysite.com`)

**2. Include all frontend URLs**

Add each frontend URL on a new line:
```
https://mysite.com
https://www.mysite.com
http://localhost:3000
```

**3. Use CORS filter for dynamic origins**

For staging/preview environments:

```php
add_filter('nextpress_cors_allowed_origins', function($origins) {
  // Add Vercel preview URLs
  if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (preg_match('/\.vercel\.app$/', $origin)) {
      $origins[] = $origin;
    }
  }
  return $origins;
});
```

**4. Check WPGraphQL CORS settings**

If using WPGraphQL directly (not through proxy), also configure WPGraphQL's CORS settings.

## Scripts Not Loading

### Symptoms
- JavaScript errors in console
- WordPress functionality broken
- Interactive elements don't work

### Solutions

**1. Check GraphQL query**

Ensure your query includes all script fields:

```graphql
query GetAssets($uri: String!) {
  uriAssets(uri: $uri) {
    scripts {
      handle
      src
      version
      location
      strategy
      dependencies
      extraData
      before
      after
    }
  }
}
```

**2. Use correct components**

- `HeadScripts` for `location: 'HEADER'` scripts
- `BodyScripts` for `location: 'FOOTER'` scripts

```tsx
const headerScripts = scripts.filter(s => s.location === 'HEADER');
const footerScripts = scripts.filter(s => s.location === 'FOOTER');
```

**3. Check dependency resolution**

Scripts with missing dependencies won't load correctly. Verify all dependency handles are included in the scripts array.

## Assets Return 404

### Symptoms
- Images, CSS, or JS files return 404
- Broken images on page
- Styles not applied

### Solutions

**1. Check asset proxy routes**

Ensure your matcher includes asset routes:

```ts
matcher: [
  '/atx/:instance/wp-assets/:path*',
  '/atx/:instance/wp-internal-assets/:path*',
],
```

**2. Verify WordPress URLs**

Check `wpHomeUrl` and `wpSiteUrl` in your config:

```js
// Standard WordPress
{
  wpDomain: 'example.com',
  wpProtocol: 'https',
}

// Bedrock (WordPress in /wp subdirectory)
{
  wpDomain: 'example.com',
  wpProtocol: 'https',
  wpHomeUrl: 'https://example.com',
  wpSiteUrl: 'https://example.com/wp',
}
```

**3. Check instance prop**

For multi-WordPress setups, ensure components have the correct `instance` prop:

```tsx
<Content content={content} instance="blog" />
```

## WooCommerce Cart Issues

### Symptoms
- Cart doesn't persist
- Add to cart fails
- Checkout broken

### Solutions

**1. Enable WooCommerce script replacement**

In **Settings > NextPress**, enable "Replace WooCommerce Scripts". This fixes stale nonce issues.

**2. Handle Cart-Token**

Implement Cart-Token handling in your proxy:

```ts
export const proxy = async (request: NextRequest) => {
  if (isProxiedRoute(pathname)) {
    // Get Cart-Token from cookies
    const cartToken = request.cookies.get('cartToken')?.value;
    if (cartToken) {
      request.headers.set('Cart-Token', cartToken);
    }

    const response = await proxyByWCR(request);

    // Save updated Cart-Token
    const updatedCartToken = response.headers.get('Cart-Token');
    if (updatedCartToken) {
      const nextResponse = new NextResponse(response.body, response);
      nextResponse.cookies.set({
        name: 'cartToken',
        value: updatedCartToken,
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
      });
      return nextResponse;
    }

    return response;
  }
  // ...
};
```

**3. Check nonce handling**

For authenticated requests, ensure the Authorization header is forwarded.

## Stripe Payments Not Working

### Symptoms
- Stripe checkout fails
- Payment buttons don't appear
- Express checkout broken

### Solutions

**1. Enable Stripe URL transforms**

In **Settings > NextPress**, enable "Transform Stripe Gateway URLs". This rewrites Stripe URLs to work through the NextPress proxy.

**2. Verify WooCommerce Stripe Gateway**

Ensure WooCommerce Stripe Gateway is installed and configured.

**3. Check HTTPS**

Stripe requires HTTPS in production. Ensure your frontend uses HTTPS.

## x-uri Header Not Available

### Symptoms
- `headers().get('x-uri')` returns null
- Layout can't determine current page
- Wrong assets loaded

### Solutions

**1. Configure matcher for page routes**

Your matcher must include page routes:

```ts
export const config = {
  matcher: [
    // WordPress API routes
    '/atx/:instance/wp',
    // ... other API routes

    // Page routes (REQUIRED for x-uri header)
    '/((?!_next|api|favicon.ico|.*\\.).*)',
  ],
};
```

**2. Set x-uri header in proxy**

Ensure your proxy sets the header for non-API routes:

```ts
export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (isProxiedRoute(pathname)) {
    return proxyByWCR(request);
  }

  // Set x-uri for page routes
  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({
    request: { headers },
  });
};
```

## wp-api-fetch Requests Failing

### Symptoms
- WordPress block editor integrations broken
- REST API calls from scripts fail
- Nonce validation errors

### Solutions

**1. Enable wp-api-fetch replacement**

In **Settings > NextPress**, ensure "Replace wp-api-fetch Script" is enabled (default: on).

**2. Check proxy routing**

The replaced wp-api-fetch routes requests through your Next.js proxy. Ensure the proxy is configured correctly.

**3. Disable if conflicts occur**

If you experience conflicts with other plugins, disable the setting and handle API routing manually.

## GraphQL Query Errors

### Symptoms
- `uriAssets` returns null
- GraphQL errors in console
- Missing data

### Solutions

**1. Verify WPGraphQL is installed**

The NextPress plugin requires WPGraphQL 1.27.0+.

**2. Check URI format**

The URI should be the path without domain:

```graphql
# Correct
uriAssets(uri: "/about")

# Incorrect
uriAssets(uri: "https://example.com/about")
```

**3. Test in GraphQL IDE**

Use the GraphQL IDE in WordPress admin to test queries directly.

## Debug Mode

For detailed debugging, enable Next.js debug mode:

```bash
DEBUG=nextpress:* npm run dev
```

This logs:
- Proxy request/response details
- Configuration resolution
- Asset URL rewriting

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/axistaylor/nextpress/issues)
2. Review the [documentation](./getting-started.md)
3. Open a new issue with:
   - NextPress version
   - WordPress/WPGraphQL versions
   - Next.js version
   - Steps to reproduce
   - Error messages

## Related

- [Getting Started](./getting-started.md) - Initial setup
- [WordPress Plugin](./wordpress-plugin.md) - Plugin settings
- [proxyByWCR](./proxy-by-wcr.md) - Proxy configuration
- [withWCR](./with-wcr.md) - Next.js configuration
