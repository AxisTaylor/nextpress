<!--
title: "Stylesheets Component"
description: "Render WordPress stylesheets with inline styles and automatic head hoisting via React precedence."
author: "AxisTaylor, LLC"
keywords: "NextPress, Stylesheets, WordPress, CSS, stylesheets, Next.js, server component"
-->

# Stylesheets

The `Stylesheets` component renders WordPress stylesheets as server-rendered `<link>` tags with React's `precedence` attribute for automatic `<head>` hoisting, plus inline `<style>` tags for before/after CSS.

## Basic Usage

```tsx
import { Stylesheets } from '@axistaylor/nextpress';

export default async function WordPressLayout({ children }) {
  const { stylesheets } = await fetchAssets(uri);

  return (
    <html>
      <head>
        <Stylesheets stylesheets={stylesheets} pathname={uri} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stylesheets` | `EnqueuedStylesheet[]` | Yes | Array of WordPress stylesheets to render |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |
| `pathname` | `string` | No | Current page pathname for scoping |
| `criticalHandles` | `string[]` | No | Handles to keep render-blocking (see [Critical handles](#critical-handles) below). Omit to keep all sheets blocking (legacy behaviour). |

## Critical handles

By default — when `criticalHandles` is omitted — every proxied stylesheet renders as a normal render-blocking `<link rel="stylesheet">`, which is what Lighthouse flags as "Eliminate render-blocking resources".

Pass `criticalHandles` to whitelist the small set of stylesheets that genuinely need to paint above the fold (typically your theme stylesheet + `wp-block-library` + `wp-block-library-theme` + `global-styles`). Anything **not** in the whitelist gets the deferred treatment:

1. `<link rel="stylesheet" href="…" media="print" data-np-defer="1" precedence="…">` — the browser fetches it at a non-render-blocking priority.
2. An inline swap-script at the end of the stylesheets fragment promotes `media` to `"all"` on the `load` event (synchronously for cache hits via `link.sheet`).

```tsx
<Stylesheets
  stylesheets={stylesheets}
  criticalHandles={[
    'wp-block-library',
    'wp-block-library-theme',
    'global-styles',
    'classic-theme-styles',
    'my-theme-style',          // your theme's main handle
  ]}
/>
```

### Trade-offs

**Cascade order is preserved.** CSS cascade is decided by the DOM position of `<link>` / `<style>` elements, not load order. We keep DOM positions (via React 19's `precedence` prop), so once every deferred sheet has loaded + swapped to `media="all"`, the browser re-evaluates the cascade with the same precedence chain.

**Transient FOUC on first visit.** Between First Contentful Paint and the deferred sheets finishing their `load` event (~50–500ms), only your critical sheets + the inline `before` / `after` chunks (which WordPress enqueues alongside each sheet) apply. Anything that exists **only** in a deferred sheet shows a flash of unstyled content. The `before` / `after` inlines usually cover CSS-custom-property bindings + block-supports CSS for above-the-fold elements, which is why the practical FOUC is small — but it's not zero.

**Subsequent visits are FOUC-free.** Cache-hit deferred links have `link.sheet` populated synchronously when the swap-script runs, so the promotion happens before paint. Pairs nicely with an edge cache (Cloudflare, etc.) on proxied WP assets.

### When to skip it

Omitting `criticalHandles` keeps every sheet render-blocking — the previous default. Drop the prop if:
- Your CSS budget is small enough that render-blocking isn't measurably hurting LCP.
- You can't tolerate any transient FOUC (e.g. brand-critical content where the wrong fallback paint is worse than slower TTFB).
- A specific sheet ships layout rules that aren't in any `before` / `after` inline counterpart — and you can't audit which one. In that case, easier to keep everything blocking than to debug FOUC.

## Placement

Stylesheets uses React's `<link precedence>` attribute, which automatically hoists `<link>` tags to `<head>` regardless of where the component is rendered in the tree. Placing it in `<head>` is conventional but not strictly required.

```tsx
// app/(wordpress)/layout.tsx
export default async function WordPressLayout({ children }) {
  const { stylesheets, scripts } = await fetchAssets(uri);

  return (
    <html>
      <head>
        <Stylesheets stylesheets={stylesheets} pathname={uri} />
        <WPHead scripts={scripts} pathname={uri} />
      </head>
      <body>
        {children}
        <WPFooter scripts={scripts} pathname={uri} />
      </body>
    </html>
  );
}
```

## Marker Tags

`Stylesheets` emits two zero-byte marker `<style>` tags around its output: `id="nextpress-stylesheets-start"` and `id="nextpress-stylesheets-end"`. These are the boundaries [AssetUpdater](./asset-updater.md) uses to clear and re-insert the stylesheet block on client-side navigation. You should not need to interact with them directly — just leave them in the DOM.

## Features

### Inline Styles

Stylesheets handles WordPress inline styles with scoping:

- **`before`** - CSS rendered as a `<style>` tag before the stylesheet link (precedence: `low`)
- **`after`** - CSS rendered as a `<style>` tag after the stylesheet link (precedence: `high`)

```tsx
const stylesheet = {
  handle: 'theme-styles',
  src: 'https://example.com/style.css',
  before: [':root { --primary-color: blue; }'],
  after: ['.custom-class { color: var(--primary-color); }'],
};
```

### URL Proxying

WordPress asset URLs are automatically transformed to proxy paths:

- Content assets (`/wp-content/...`) become `/atx/{instance}/wp-assets/...`
- Internal assets (`/wp-includes/...`, `/wp-admin/...`) become `/atx/{instance}/wp-internal-assets/...`

## GraphQL Query

Fetch stylesheets with this GraphQL query:

```graphql
query GetAssets($uri: String!) {
  assetsByUri(uri: $uri) {
    enqueuedStylesheets(first: 500) {
      nodes {
        handle
        src
        version
        before
        after
      }
    }
  }
}
```

## Multi-WordPress Support

When using multiple WordPress backends:

```tsx
<Stylesheets stylesheets={stylesheets} instance="shop" pathname={uri} />
```

## Server Component

Stylesheets is a React Server Component:

- Renders on the server with zero client JavaScript
- Stylesheets are included in the initial HTML response
- Uses React `precedence` for automatic `<head>` hoisting

## TypeScript

```tsx
import { Stylesheets } from '@axistaylor/nextpress';
import type { EnqueuedStylesheet } from '@axistaylor/nextpress';
```

## Related

- [WPHead](./wp-head.md) - Header script loading
- [WPFooter](./wp-footer.md) - Footer script loading
- [Getting Started](../getting-started.md) - Initial setup
