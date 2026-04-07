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

- [HeadScripts](./head-scripts.md) - Header script loading
- [BodyScripts](./body-scripts.md) - Footer script loading
- [Getting Started](../getting-started.md) - Initial setup
