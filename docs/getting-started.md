<!--
title: "Getting Started with NextPress"
description: "Step-by-step guide to setting up NextPress for rendering WordPress content in your Next.js application."
author: "AxisTaylor, LLC"
keywords: "NextPress, Next.js, WordPress, setup, installation, WPGraphQL, headless CMS"
-->

# Getting Started

This guide walks you through setting up NextPress to render WordPress content in your Next.js application.

## Prerequisites

- Node.js 18+
- Next.js 14.2.5+ (or Next.js 16+ for proxy.ts)
- WordPress site with:
  - [WPGraphQL](https://www.wpgraphql.com/) plugin
  - [NextPress WordPress plugin](./wordpress-plugin.md)

## Installation

```bash
npm install @axistaylor/nextpress
```

## Setup

### 1. Configure Next.js

Wrap your Next.js config with `withWCR` to set up WordPress connection:

```js
// next.config.mjs
import { withWCR } from '@axistaylor/nextpress/withWCR';

const nextConfig = {
  // Your existing Next.js config
};

export default withWCR(nextConfig, {
  wpDomain: 'your-wordpress.com',
  wpProtocol: 'https',
  frontendDomain: 'localhost:3000',
  frontendProtocol: 'http',
});
```

See [withWCR documentation](./with-wcr.md) for all configuration options.

### 2. Add Proxy (Next.js 16+)

Create a `proxy.ts` file in your app root. This handles WordPress API proxying and sets the `x-uri` header for layout components:

```ts
// proxy.ts
import { NextResponse, NextRequest } from 'next/server';
import { proxyByWCR, isProxiedRoute } from '@axistaylor/nextpress/proxyByWCR';

export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // Check if this is a WordPress API route that needs proxying
  if (isProxiedRoute(pathname)) {
    return proxyByWCR(request);
  }

  // For page routes, set x-uri header so layouts can fetch assets
  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({
    request: {
      headers,
    },
  });
};

// CRITICAL: Matcher must include BOTH API routes AND page routes
// - API routes: For proxying WordPress REST API, AJAX, and assets
// - Page routes: To set x-uri header for layout asset fetching
export const config = {
  matcher: [
    // WordPress API routes for proxying
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-internal-assets/:path*',
    '/atx/:instance/wp-assets/:path*',
    '/atx/:instance/wp-json/:path*',
    // Page routes that need x-uri header
    // Excludes static files, Next.js internals, and API routes
    '/((?!_next|api|favicon.ico|.*\\.).*)',
  ],
};
```

> **Important**: The matcher must include your page routes for the `x-uri` header to be available in layouts. Without matching the page routes, the proxy function won't run and layouts won't receive the URI.

See [proxyByWCR documentation](./proxy-by-wcr.md) for details and WooCommerce Cart-Token handling.

### 3. Create GraphQL Utility

Create a utility function to fetch WordPress content and assets:

```ts
// lib/wordpress.ts
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://your-wordpress.com/graphql';

export async function fetchPage(uri: string) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query GetPage($uri: String!) {
          nodeByUri(uri: $uri) {
            ... on Page { content }
            ... on Post { content }
          }
        }
      `,
      variables: { uri },
    }),
    next: { revalidate: 60 },
  });

  const { data } = await response.json();
  return { content: data?.nodeByUri?.content || '' };
}

export async function fetchAssets(uri: string) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query GetAssets($uri: String!) {
          assetsByUri(uri: $uri) {
            importMap(scheme: RELATIVE) {
              name
              path
            }
            enqueuedStylesheets(first: 500) {
              nodes {
                handle
                src
                version
                before
                after
                dependencies { handle }
              }
            }
            enqueuedScripts(first: 500) {
              nodes {
                handle
                src
                strategy
                version
                group
                location
                type
                before
                after
                extraData
                dependencies { handle }
              }
            }
          }
        }
      `,
      variables: { uri },
    }),
    next: { revalidate: 60 },
  });

  const { data } = await response.json();
  const assets = data?.assetsByUri;
  return {
    scripts: assets?.enqueuedScripts?.nodes || [],
    stylesheets: assets?.enqueuedStylesheets?.nodes || [],
    importMap: assets?.importMap || [],
  };
}

export async function fetchGlobalStyles() {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query GetGlobalStyles {
          globalStyles {
            stylesheet
            customCss
            renderedFontFaces
          }
        }
      `,
    }),
    next: { revalidate: 60 },
  });

  const { data } = await response.json();
  return data?.globalStyles || null;
}
```

### 4. Create Asset Fetcher Server Action

Create a server action that the `AssetUpdater` client component can call on client-side navigation to refresh assets:

```ts
// actions/fetchAssets.ts
'use server';

import { fetchAssets, fetchGlobalStyles } from '@/lib/wordpress';
import type { AssetData } from '@axistaylor/nextpress/client';

export async function fetchAssetsAction(uri: string): Promise<AssetData> {
  const [{ stylesheets, scripts, importMap }, globalStyles] = await Promise.all([
    fetchAssets(uri),
    fetchGlobalStyles(),
  ]);

  return { stylesheets, scripts, globalStyles, importMap };
}
```

### 5. Create AssetUpdater Client Wrapper

The `AssetUpdater` needs the current pathname from `next/navigation`. Create a thin client wrapper:

```tsx
// components/AssetUpdater.tsx
'use client';

import { usePathname } from 'next/navigation';
import { AssetUpdater as NextPressAssetUpdater } from '@axistaylor/nextpress/client';
import type { AssetData } from '@axistaylor/nextpress/client';

interface AssetUpdaterProps {
  fetchAssets: (uri: string) => Promise<AssetData>;
  instance?: string;
}

export function AssetUpdater({ fetchAssets, instance }: AssetUpdaterProps) {
  const pathname = usePathname();
  return (
    <NextPressAssetUpdater
      pathname={pathname}
      instance={instance}
      fetchAssets={fetchAssets}
    />
  );
}
```

### 6. Create WordPress Layout

Create a layout that loads scripts, styles, global styles, and the import map:

```tsx
// app/(wordpress)/layout.tsx
import { WPHead, WPFooter } from '@axistaylor/nextpress';
import { headers } from 'next/headers';
import { fetchAssets, fetchGlobalStyles } from '@/lib/wordpress';
import { fetchAssetsAction } from '@/actions/fetchAssets';
import { AssetUpdater } from '@/components/AssetUpdater';

export default async function WordPressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get URI from proxy header (set by proxy.ts)
  const headersList = await headers();
  const uri = headersList.get('x-uri') || '/';

  // Fetch WordPress assets and global styles for this URI
  const [{ scripts, stylesheets, importMap }, globalStyles] = await Promise.all([
    fetchAssets(uri),
    fetchGlobalStyles(),
  ]);

  return (
    <html lang="en">
      <head>
        <WPHead
          scripts={scripts}
          stylesheets={stylesheets}
          globalStyles={globalStyles}
          importMap={importMap}
          pathname={uri}
        />
      </head>
      <body>
        <main>{children}</main>
        <WPFooter scripts={scripts} pathname={uri} />
        <AssetUpdater fetchAssets={fetchAssetsAction} />
      </body>
    </html>
  );
}
```

> **Why use a layout?** Loading scripts and stylesheets in a layout component ensures they're loaded once for all pages in that route group, improving performance. See [WPHead documentation](./api/wp-head.md) for more details.

> **About `AssetUpdater`:** Next.js does not re-run the server layout on client-side navigation, so the server-rendered assets would go stale as the user clicks around. `AssetUpdater` is a small client component that re-fetches the stylesheets, scripts, global styles, and import map and swaps them in place on every navigation.

> **Tailwind users:** If your project uses Tailwind's default Preflight layer on the same routes, it can override WordPress's scoped theme styles (most visibly on WooCommerce cart/checkout buttons). See [Troubleshooting → Tailwind Preflight Overriding WordPress Styles](./troubleshooting.md#tailwind-preflight-overriding-wordpress-styles) for the recommended workarounds.

### 7. Create Page Component

Create a page component that renders WordPress content:

```tsx
// app/(wordpress)/[[...uri]]/page.tsx
import { Content } from '@axistaylor/nextpress';
import { fetchPage } from '@/lib/wordpress';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ uri?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { uri: uriSegments } = await params;
  const uri = '/' + (uriSegments?.join('/') || '');

  const { content } = await fetchPage(uri);

  if (!content) {
    notFound();
  }

  return <Content content={content} />;
}
```

### 8. Configure Environment Variables

Create a `.env.local` file:

```bash
GRAPHQL_ENDPOINT=https://your-wordpress.com/graphql
```

## Project Structure

After setup, your project structure should look like:

```
your-nextjs-app/
├── app/
│   └── (wordpress)/           # Route group for WordPress pages
│       ├── layout.tsx         # Loads scripts, styles, global styles, import map
│       └── [[...uri]]/
│           └── page.tsx       # Renders content
├── actions/
│   └── fetchAssets.ts         # Server action for AssetUpdater
├── components/
│   └── AssetUpdater.tsx       # Client wrapper for pathname
├── lib/
│   └── wordpress.ts           # GraphQL utilities
├── proxy.ts                   # WordPress API proxy + URI header
├── next.config.mjs            # withWCR configuration
└── .env.local                 # Environment variables
```

## Next Steps

- [Content Component](./api/content.md) - Learn about custom parsers for modifying rendered content
- [WPHead](./api/wp-head.md) - Global styles, import maps, and script loading
- [WPScripts](./api/wp-scripts.md) - Script type handling (classic, deferred, async, module)
- [ImportMap](./api/import-map.md) - ES module import map for the Interactivity API
- [WordPress Plugin](./wordpress-plugin.md) - Configure the NextPress WordPress plugin
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
