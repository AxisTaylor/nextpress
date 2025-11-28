# HeadScripts

The `HeadScripts` component renders WordPress header scripts with proper dependency resolution, loading strategies, and inline script support.

## Basic Usage

```tsx
import { HeadScripts } from '@axistaylor/nextpress/client';

export default function Layout({ children, scripts }) {
  const headerScripts = scripts.filter(s => s.location === 'HEADER');

  return (
    <html>
      <head>
        <HeadScripts scripts={headerScripts} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scripts` | `EnqueuedScript[]` | Yes | Array of WordPress scripts to render |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |

## Optimal Placement

**HeadScripts should be placed in the `<head>` element of your root layout.** This ensures:

- Scripts load early in the page lifecycle
- Dependencies are resolved before they're needed
- Consistent script loading across all pages in the route group

```tsx
// app/(wordpress)/layout.tsx
export default async function WordPressLayout({ children }) {
  // ... fetch scripts
  return (
    <html>
      <head>
        {/* Other head elements */}
        <HeadScripts scripts={headerScripts} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Retrieving URI in Layouts

To fetch the correct scripts for each page, you need to know the current URI in your layout component. This is done through the proxy/middleware setting a custom header.

### Step 1: Configure Proxy to Set URI Header

In your `proxy.ts` (Next.js 16+), set the `x-uri` header for page routes:

```ts
// proxy.ts
import { NextResponse, NextRequest } from 'next/server';
import { proxyByWCR, isProxiedRoute } from '@axistaylor/nextpress/proxyByWCR';

export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // Handle WordPress API routes
  if (isProxiedRoute(pathname)) {
    return proxyByWCR(request);
  }

  // For page routes, set x-uri header
  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({
    request: {
      headers,
    },
  });
};

// CRITICAL: Matcher must include page routes to set the header
export const config = {
  matcher: [
    // WordPress API routes
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-json/:path*',
    '/atx/:instance/wp-assets/:path*',
    // Page routes - REQUIRED for x-uri header
    '/((?!_next|api|favicon.ico|.*\\.).*)',
  ],
};
```

### Step 2: Read URI Header in Layout

Use Next.js `headers()` function to read the URI:

```tsx
// app/(wordpress)/layout.tsx
import { HeadScripts, BodyScripts } from '@axistaylor/nextpress/client';
import { RenderStylesheets } from '@axistaylor/nextpress';
import { headers } from 'next/headers';
import { fetchAssets } from '@/lib/wordpress';

export default async function WordPressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get URI from proxy header
  const headersList = await headers();
  const uri = headersList.get('x-uri') || '/';

  // Fetch assets for this specific URI
  const { scripts, stylesheets } = await fetchAssets(uri);

  // Separate by location
  const headerScripts = scripts.filter((s) => s.location === 'HEADER');
  const footerScripts = scripts.filter((s) => s.location === 'FOOTER');

  return (
    <html lang="en">
      <head>
        <RenderStylesheets stylesheets={stylesheets} />
        <HeadScripts scripts={headerScripts} />
      </head>
      <body>
        {children}
        <BodyScripts scripts={footerScripts} />
      </body>
    </html>
  );
}
```

### Why This Pattern?

1. **Layouts don't have access to route params** - Unlike page components, layouts can't access `params` for dynamic routes
2. **Assets are URI-specific** - Different pages enqueue different scripts
3. **Performance** - Loading scripts in the layout ensures they're loaded once per navigation, not re-fetched on every page

## Script Loading Strategies

HeadScripts respects WordPress script loading strategies:

| Strategy | Behavior |
|----------|----------|
| `DEFER` | Script loads after HTML parsing (`defer` attribute) |
| `ASYNC` | Script loads asynchronously (`async` attribute) |
| `BLOCKING` | Script blocks rendering (default, no attribute) |

```tsx
// Scripts from WordPress include strategy information
const script = {
  handle: 'my-script',
  src: 'https://example.com/script.js',
  strategy: 'DEFER', // Will render with defer attribute
  location: 'HEADER',
  // ...
};
```

## Dependency Resolution

Scripts are automatically sorted by dependencies. If script A depends on script B, script B will be rendered first:

```tsx
// WordPress enqueues scripts with dependencies
const scripts = [
  { handle: 'jquery', src: '...', dependencies: [] },
  { handle: 'my-plugin', src: '...', dependencies: ['jquery'] },
];

// HeadScripts renders jquery before my-plugin
<HeadScripts scripts={scripts} />
```

## Inline Scripts

HeadScripts handles inline scripts from WordPress:

- **`before`** - Inline script rendered before the main script
- **`after`** - Inline script rendered after the main script
- **`extraData`** - Localized script data (e.g., from `wp_localize_script`)

```tsx
const script = {
  handle: 'my-script',
  src: 'https://example.com/script.js',
  before: 'console.log("Before main script");',
  after: 'console.log("After main script");',
  extraData: 'var myData = {"apiUrl": "/api"};',
  // ...
};
```

## Multi-WordPress Support

When using multiple WordPress backends, specify the instance:

```tsx
<HeadScripts scripts={headerScripts} instance="blog" />
```

This ensures asset URLs are proxied through the correct WordPress instance.

## TypeScript

```tsx
import { HeadScripts } from '@axistaylor/nextpress/client';
import type { EnqueuedScript } from '@axistaylor/nextpress';
```

## Related

- [BodyScripts](./body-scripts.md) - Footer script loading
- [RenderStylesheets](./render-stylesheets.md) - Stylesheet loading
- [proxyByWCR](./proxy-by-wcr.md) - Proxy configuration
- [Getting Started](./getting-started.md) - Initial setup
