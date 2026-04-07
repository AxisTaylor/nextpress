<!--
title: "HeadScripts Component"
description: "Render WordPress header scripts as server components using next/script with beforeInteractive strategy."
author: "AxisTaylor, LLC"
keywords: "NextPress, HeadScripts, WordPress, scripts, next/script, beforeInteractive, server component"
-->

# HeadScripts

The `HeadScripts` component renders WordPress header scripts using `next/script` with the `beforeInteractive` strategy. It is a server component that renders scripts in document order before any Next.js code runs.

## Basic Usage

```tsx
import { HeadScripts } from '@axistaylor/nextpress';

export default async function WordPressLayout({ children }) {
  const { scripts } = await fetchAssets(uri);

  return (
    <html>
      <head>
        <HeadScripts scripts={scripts} pathname={uri} />
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
| `pathname` | `string` | No | Current page pathname |

## How It Works

HeadScripts filters for scripts with `location === 'HEADER'` and renders each one as a `next/script` component with `strategy="beforeInteractive"`. This means:

- Scripts are injected into the initial HTML `<head>`
- They execute before any Next.js JavaScript runs
- They load in the order rendered (dependency ordering is handled server-side by WordPress)

Because `next/script` with `beforeInteractive` hoists to `<head>` automatically, HeadScripts works correctly regardless of where it's placed in the component tree.

## Retrieving URI in Layouts

To fetch the correct scripts for each page, you need the current URI in your layout. This is done through the proxy/middleware setting a custom header.

### Step 1: Configure Proxy to Set URI Header

In your `proxy.ts` (Next.js 16+) or `middleware.ts`, set the `x-uri` header:

```ts
import { NextResponse, NextRequest } from 'next/server';
import { proxyByWCR, isProxiedRoute } from '@axistaylor/nextpress/proxyByWCR';

export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (isProxiedRoute(pathname)) {
    return proxyByWCR(request);
  }

  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({ request: { headers } });
};
```

### Step 2: Read URI Header in Layout

```tsx
// app/(wordpress)/layout.tsx
import { HeadScripts, BodyScripts, Stylesheets } from '@axistaylor/nextpress';
import { headers } from 'next/headers';

export default async function WordPressLayout({ children }) {
  const uri = (await headers()).get('x-uri') || '/';
  const { scripts, stylesheets } = await fetchAssets(uri);

  return (
    <html>
      <head>
        <Stylesheets stylesheets={stylesheets} pathname={uri} />
        <HeadScripts scripts={scripts} pathname={uri} />
      </head>
      <body>
        {children}
        <BodyScripts scripts={scripts} pathname={uri} />
      </body>
    </html>
  );
}
```

## Script Rendering

For each header script, HeadScripts renders (in order):

1. **`extraData`** (id `{handle}-js-extra`) - Localized script data (from `wp_localize_script`)
2. **`before`** (id `{handle}-js-before`) - Inline script before the main script
3. **NextPress config** - Automatically injected after `wp-api-fetch` for proxy URL configuration
4. **Main script** (id `{handle}`) - The script `src` proxied through Next.js
5. **`after`** (id `{handle}-js-after`) - Inline script after the main script

The `-js-extra` / `-js-before` / `-js-after` suffixes match WordPress's own `wp_enqueue_script` naming convention, so client-side consumers (like [AssetUpdater](./asset-updater.md)) can reliably target individual inline fragments — e.g. to run `processWcSettings()` after the `wc-settings-js-extra` block has executed.

All rendered with `strategy="beforeInteractive"`.

## Marker Tags

`HeadScripts` brackets its output with two zero-byte marker scripts: `id="nextpress-head-scripts-start"` and `id="nextpress-head-scripts-end"`. [AssetUpdater](./asset-updater.md) uses these as the clear-and-refill boundary on client-side navigation.

## URL Proxying

WordPress asset URLs are automatically transformed:

- Content assets (`/wp-content/...`) become `/atx/{instance}/wp-assets/...`
- Internal assets (`/wp-includes/...`, `/wp-admin/...`) become `/atx/{instance}/wp-internal-assets/...`

## Multi-WordPress Support

When using multiple WordPress backends:

```tsx
<HeadScripts scripts={scripts} instance="blog" pathname={uri} />
```

## Server Component

HeadScripts is a React Server Component:

- No `'use client'` directive
- Renders `next/script` tags on the server
- Dependency ordering handled server-side by WordPress `assetsByUri` GraphQL query
- No client-side script tracking or deduplication needed

## TypeScript

```tsx
import { HeadScripts } from '@axistaylor/nextpress';
import type { EnqueuedScript } from '@axistaylor/nextpress';
```

## Related

- [BodyScripts](./body-scripts.md) - Footer script loading
- [Stylesheets](./stylesheets.md) - Stylesheet loading
- [proxyByWCR](./proxy-by-wcr.md) - Proxy configuration
- [Getting Started](../getting-started.md) - Initial setup
