<!--
title: "BodyScripts Component"
description: "Render WordPress footer scripts as server components using next/script with afterInteractive strategy."
author: "AxisTaylor, LLC"
keywords: "NextPress, BodyScripts, WordPress, scripts, next/script, afterInteractive, server component"
-->

# BodyScripts

The `BodyScripts` component renders WordPress footer scripts using `next/script` with the `afterInteractive` strategy. It is a server component that loads scripts after page hydration.

## Basic Usage

```tsx
import { BodyScripts } from '@axistaylor/nextpress';

export default async function WordPressLayout({ children }) {
  const { scripts } = await fetchAssets(uri);

  return (
    <html>
      <head>{/* ... */}</head>
      <body>
        {children}
        <BodyScripts scripts={scripts} pathname={uri} />
      </body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scripts` | `EnqueuedScript[]` | Yes | Array of WordPress scripts to render |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |
| `pathname` | `string` | No | Current page pathname (used for WooCommerce proxy placeholder replacement) |

## How It Works

BodyScripts filters for scripts with `location === 'FOOTER'` and renders each one as a `next/script` component with `strategy="afterInteractive"`. This means:

- Scripts load after page hydration
- Page content renders first without blocking
- Scripts execute in the order rendered (dependency ordering handled server-side by WordPress)

Because `next/script` with `afterInteractive` is managed by Next.js regardless of component tree position, BodyScripts works correctly wherever it's placed.

## Retrieving URI in Layouts

BodyScripts needs the current URI for WooCommerce URL transformations. See [HeadScripts - Retrieving URI in Layouts](./head-scripts.md#retrieving-uri-in-layouts) for the complete setup guide.

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

For each footer script, BodyScripts renders (in order):

1. **`extraData`** (id `{handle}-js-extra`) - Localized script data with proxy placeholder replacement
2. **`before`** (id `{handle}-js-before`) - Inline script (with `wc-settings` URL transformation for WooCommerce)
3. **Main script** (id `{handle}`) - The script `src` (external scripts loaded directly, WordPress assets proxied)
4. **`after`** (id `{handle}-js-after`) - Inline script after the main script

The `-js-extra` / `-js-before` / `-js-after` ID suffixes match WordPress's `wp_enqueue_script` naming so [AssetUpdater](./asset-updater.md) can reliably locate each fragment on client-side navigation — in particular so `processWcSettings()` can run immediately after the `wc-settings-js-extra` block defines `window.wcSettings`.

All rendered with `strategy="afterInteractive"`.

## Marker Tags

`BodyScripts` brackets its output with two zero-byte marker scripts: `id="nextpress-body-scripts-start"` and `id="nextpress-body-scripts-end"`. [AssetUpdater](./asset-updater.md) uses these as the clear-and-refill boundary on client-side navigation.

## WooCommerce Compatibility

BodyScripts includes special handling for WooCommerce:

- **`wc-settings` transformation**: The `before` script for `wc-settings` is transformed to replace WordPress backend URLs with frontend proxy URLs
- **Proxy placeholder replacement**: `extraData` content has proxy placeholders resolved for the current instance and pathname
- **External script detection**: Scripts from CDNs and payment gateways (e.g., Stripe) are loaded directly without proxying

## URL Proxying

WordPress asset URLs are automatically transformed:

- Content assets (`/wp-content/...`) become `/atx/{instance}/wp-assets/...`
- Internal assets (`/wp-includes/...`, `/wp-admin/...`) become `/atx/{instance}/wp-internal-assets/...`
- External scripts (different origin from WordPress backend) are loaded directly

## Multi-WordPress Support

When using multiple WordPress backends:

```tsx
<BodyScripts scripts={scripts} instance="shop" pathname={uri} />
```

## Server Component

BodyScripts is a React Server Component:

- No `'use client'` directive
- Renders `next/script` tags on the server
- Dependency ordering handled server-side by WordPress `assetsByUri` GraphQL query
- WooCommerce URL transformations performed server-side

## TypeScript

```tsx
import { BodyScripts } from '@axistaylor/nextpress';
import type { EnqueuedScript } from '@axistaylor/nextpress';
```

## Related

- [HeadScripts](./head-scripts.md) - Header script loading and URI retrieval
- [Stylesheets](./stylesheets.md) - Stylesheet loading
- [Getting Started](../getting-started.md) - Initial setup
