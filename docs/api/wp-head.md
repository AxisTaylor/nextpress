<!--
title: "WPHead Component"
description: "Render WordPress header scripts, global styles, and import maps as server components."
author: "AxisTaylor, LLC"
keywords: "NextPress, WPHead, WordPress, scripts, modules, import map, global styles, server component"
-->

# WPHead

The `WPHead` component is a server component wrapper that renders WordPress head assets: global styles, the script module import map, and header scripts.

> **Deprecated alias:** `HeadScripts` is still exported as an alias for backwards compatibility, but new code should use `WPHead`.

It combines [`GlobalStyles`](./global-styles.md), [`Stylesheets`](./stylesheets.md), [`ImportMap`](./import-map.md), and [`WPScripts`](./wp-scripts.md) into a single component for the `<head>`.

## Basic Usage

```tsx
import { WPHead, WPFooter } from '@axistaylor/nextpress';

export default async function WordPressLayout({ children }) {
  const { scripts, stylesheets, importMap } = await fetchAssets(uri);
  const globalStyles = await fetchGlobalStyles();

  return (
    <html>
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
        {children}
        <WPFooter scripts={scripts} pathname={uri} />
      </body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scripts` | `EnqueuedScript[]` | Yes | Array of WordPress scripts to render |
| `globalStyles` | `GlobalStylesType \| null` | No | WordPress global styles (theme.json stylesheet, custom CSS, font faces) |
| `importMap` | `WPImport[]` | No | Import map entries for script modules (`@wordpress/interactivity`, etc.) |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |
| `pathname` | `string` | No | Current page pathname |

## What It Renders

WPHead renders three sub-components in order:

1. **`<GlobalStyles>`** — Scoped theme.json stylesheet, font faces, and custom CSS
2. **`<ImportMap>`** — `<script type="importmap">` for ES module bare specifier resolution
3. **`<WPScripts location="head">`** — Header scripts (classic, deferred, async, and module)

## Script Types

WPHead (via WPScripts) handles four types of scripts:

| Type | Rendering | Strategy |
|------|-----------|----------|
| **Classic** | `next/script` | `beforeInteractive` |
| **Deferred** (`strategy: DEFER`) | `next/script` | `afterInteractive` (executes after DOM) |
| **Async** (`strategy: ASYNC`) | `next/script` | `beforeInteractive` |
| **Module** (`type: MODULE`) | Plain `<script type="module">` | N/A (modules are deferred by spec) |

## Import Map

When `importMap` is provided, WPHead renders a `<script type="importmap">` before any scripts. This allows ES modules (like `@wordpress/interactivity` view scripts) to resolve bare specifiers:

```json
{
  "imports": {
    "@wordpress/interactivity": "/atx/default/wp-internal-assets/wp-includes/js/dist/script-modules/interactivity/debug.js"
  }
}
```

The import map entries come from the `assetsByUri` GraphQL query's `importMap(scheme: RELATIVE)` field.

## Multisite / Multi-Instance Support

On WordPress multisite, plugin assets may be served from a different domain than the content site (e.g. `axistaylor.local` vs `woographql.local`). WPScripts automatically detects this via `isScriptForAnotherInstance()` and routes the script through the correct instance's proxy:

```tsx
<WPHead scripts={scripts} instance="demo" pathname={uri} />
```

## Inline Script Processing

All inline script content (`extraData`, `before`, `after`) is processed through `replaceProxyPlaceholders()` to rewrite `__NEXTPRESS_PROXY__` and `__NEXTPRESS_ASSETS__` placeholders. The `wc-settings` inline script additionally goes through `transformWcSettings()`.

## Marker Tags

WPScripts brackets its output with marker scripts (`nextpress-head-scripts-start` / `nextpress-head-scripts-end`) used by [AssetUpdater](./asset-updater.md) for client-side navigation.

## Related

- [WPScripts](./wp-scripts.md) - Core script rendering component
- [WPFooter](./wp-footer.md) - Footer script loading
- [GlobalStyles](./global-styles.md) - WordPress global styles
- [ImportMap](./import-map.md) - Script module import map
- [Stylesheets](./stylesheets.md) - Stylesheet loading
- [AssetUpdater](./asset-updater.md) - Client-side asset refresh
