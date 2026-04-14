<!--
title: "ImportMap Component"
description: "Render a script module import map for WordPress Interactivity API and other ES module dependencies."
author: "AxisTaylor, LLC"
keywords: "NextPress, ImportMap, import map, script modules, interactivity API, ES modules"
-->

# ImportMap

The `ImportMap` component renders a `<script type="importmap">` tag that maps bare module specifiers (like `@wordpress/interactivity`) to proxied URLs. This is required for WordPress blocks that use `viewScriptModule` and the Interactivity API.

## Basic Usage

`ImportMap` is typically used via [`WPHead`](./wp-head.md) which renders it automatically when `importMap` is provided:

```tsx
<WPHead
  scripts={scripts}
  globalStyles={globalStyles}
  importMap={importMap}
  pathname={uri}
/>
```

To use standalone:

```tsx
import { ImportMap } from '@axistaylor/nextpress';

<ImportMap imports={importMap} instance="default" pathname={uri} />
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `imports` | `WPImport[]` | Yes | Array of import map entries |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |
| `pathname` | `string` | No | Current page pathname |

### `WPImport` Type

```ts
interface WPImport {
  name: string;  // Bare specifier, e.g. "@wordpress/interactivity"
  path: string;  // Relative URL, e.g. "/wp-includes/js/dist/script-modules/interactivity/debug.js"
}
```

## GraphQL Query

Import map entries come from the `importMap` field on `UriAssets`:

```graphql
query ($uri: String!) {
  assetsByUri(uri: $uri) {
    importMap(scheme: RELATIVE) {
      name
      path
    }
  }
}
```

The `scheme` argument controls URL format:
- `FULL` — Absolute WordPress URLs
- `RELATIVE` — Relative paths (recommended — `transformAssetUrl` handles proxy routing)

## How It Works

1. The WP plugin's `Uri_Assets` model calls `NextPress_Script_Modules::get_enqueued_import_map()` to read the private `WP_Script_Modules::get_import_map()` data
2. The GraphQL resolver strips the site URL prefix and returns relative paths
3. The `ImportMap` component routes each path through `transformAssetUrl()` to proxy via `/atx/{instance}/wp-internal-assets/...` or `/atx/{instance}/wp-assets/...`
4. The rendered `<script type="importmap">` allows `<script type="module">` tags to resolve bare specifiers

## Related

- [WPHead](./wp-head.md) - Wrapper that includes ImportMap
- [WPScripts](./wp-scripts.md) - Renders module scripts that use the import map
- [AssetUpdater](./asset-updater.md) - Updates import map on client-side navigation
