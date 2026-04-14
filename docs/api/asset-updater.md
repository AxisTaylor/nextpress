<!--
title: "AssetUpdater Component"
description: "Client component that refreshes server-rendered WordPress stylesheets, scripts, and global styles on client-side navigation."
author: "AxisTaylor, LLC"
keywords: "NextPress, AssetUpdater, client component, Next.js navigation, WordPress scripts, hydration, wc-settings"
-->

# AssetUpdater

The `AssetUpdater` is a client component that keeps server-rendered WordPress assets in sync across client-side navigations. On the initial SSR render, `<Stylesheets>`, `<WPHead>`, `<WPFooter>`, and `<GlobalStyles>` emit the asset markup for the current URI directly into the HTML response. When the user navigates to a new pathname on the same layout, `AssetUpdater` fetches fresh asset data, removes the previous marker-delimited block from the DOM, and re-inserts the new stylesheets, scripts, and global styles in place — preserving execution order and firing the standard page lifecycle events.

## Basic Usage

Because route-group `layout.tsx` files do **not** re-render on client-side navigation, you cannot pass `headers().get('x-uri')` straight into `AssetUpdater` — the prop would be frozen at the initial SSR value. Wrap `AssetUpdater` in a thin client component that reads the live pathname from `usePathname()` and forwards it:

```tsx
// components/AssetUpdater.tsx
'use client';

import { usePathname } from 'next/navigation';
import {
  AssetUpdater as BaseAssetUpdater,
  AssetData,
} from '@axistaylor/nextpress/client';

export interface AssetUpdaterProps {
  fetchAssets: (uri: string) => Promise<AssetData>;
  instance?: string;
}

export function AssetUpdater(props: AssetUpdaterProps) {
  const pathname = usePathname();
  return (
    <BaseAssetUpdater
      fetchAssets={props.fetchAssets}
      instance={props.instance}
      pathname={pathname}
    />
  );
}
```

Then use the wrapper in your WordPress layout:

```tsx
// app/(wordpress-pages)/layout.tsx
import { WPHead, WPFooter } from '@axistaylor/nextpress';
import { AssetUpdater } from '@/components/AssetUpdater';
import { fetchAssets } from '@/actions/fetchAssets';
import { headers } from 'next/headers';

export default async function WordPressLayout({ children }) {
  const uri = (await headers()).get('x-uri') || '/';
  // …fetch stylesheets, scripts, importMap, globalStyles for initial SSR…

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
        {/* Wrapper is a client component; no pathname prop needed here. */}
        <AssetUpdater fetchAssets={fetchAssets} />
      </body>
    </html>
  );
}
```

```ts
// actions/fetchAssets.ts
'use server';

import type { AssetData } from '@axistaylor/nextpress/client';
import { fetchStylesAndScriptsByUri, fetchGlobalStyles } from '@/lib/wordpress';

export async function fetchAssets(uri: string): Promise<AssetData> {
  const [{ stylesheets, scripts }, globalStyles] = await Promise.all([
    fetchStylesAndScriptsByUri(uri),
    fetchGlobalStyles(),
  ]);
  return { stylesheets, scripts, globalStyles };
}
```

`fetchAssets` must be a server action (or an API route wrapper) because GraphQL calls into WordPress typically require server-side credentials — `AssetUpdater` runs in the browser and cannot hold those secrets itself.

> **Why the wrapper?** `AssetUpdater` takes `pathname` as a prop so it's reusable in environments without the Next.js App Router (e.g., Pages Router, Remix). The App Router's `usePathname()` hook gives you the live pathname on every navigation without re-running the layout, which is the piece `AssetUpdater` needs to trigger its effect.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pathname` | `string` | Yes | The current pathname being rendered (usually sourced from `headers().get('x-uri')`) |
| `fetchAssets` | `(uri: string) => Promise<AssetData>` | Yes | Server action that returns fresh stylesheets, scripts, and global styles for a URI |
| `instance` | `string` | No | WordPress instance slug used for proxy URL rewriting (default: `'default'`) |

### `AssetData`

```ts
type AssetData = {
  stylesheets: EnqueuedStylesheet[];
  scripts: EnqueuedScript[];
  globalStyles?: GlobalStylesType | null;
};
```

## How It Works

`AssetUpdater` relies on marker tags emitted by the server components:

| Markers | Owner |
|---------|-------|
| `nextpress-stylesheets-start` / `nextpress-stylesheets-end` | `<Stylesheets>` |
| `nextpress-head-scripts-start` / `nextpress-head-scripts-end` | `<WPHead>` |
| `nextpress-body-scripts-start` / `nextpress-body-scripts-end` | `<WPFooter>` |

On initial mount the effect is skipped (the server already rendered those assets). On every subsequent navigation the effect:

1. Calls `fetchAssets(pathname)` to get the latest stylesheets, scripts, and `globalStyles`.
2. Replaces the old `[data-nextpress="global"]` elements with the new `<GlobalStyles>` output (scoped via `scopeStylesheet()`, placeholders resolved for the new URI).
3. Clears every DOM node between each marker pair and reinserts fresh elements — stylesheets first, then head scripts, then body scripts — matching the document order the server would have produced.
4. Inserts scripts **sequentially**, awaiting each one's load (`async=false` for external, event-dispatched completion for inline), so execution order and cross-script global state are preserved.
5. Fires `DOMContentLoaded`, `load`, and `nextpress:page-change` so WordPress scripts that initialize on those events get a chance to re-run.

## Inline Script Synchronization

Inline scripts (`-js-extra`, `-js-before`, `-js-after`) are instrumented before insertion: a `document.dispatchEvent(new CustomEvent('nextpress:inline-executed:<id>'))` call is appended to the end of each inline body and the updater awaits that event before continuing. This guarantees any follow-up hook you register (via the internal `onExecuted` callback) runs **after** the inline script's code has actually executed in the browser — not just after the `<script>` element was inserted.

The built-in follow-up is for WooCommerce:

- After the `wc-settings-js-before` inline script runs (which defines `window.wcSettings` for the new page), `processWcSettings(instance)` is invoked to resolve the `__NEXTPRESS_PROXY__` / `__NEXTPRESS_ASSETS__` placeholders inside the freshly-loaded settings object. Without this, cart and checkout blocks can get stuck in their skeleton state on client-side navigation because their Store API URLs still point at raw `__NEXTPRESS_*__` placeholders.

## Navigation Behavior

| Mount state | Effect runs? | Notes |
|-------------|--------------|-------|
| Initial SSR hydration | No | The server already rendered the markup |
| Navigating to a new URI | Yes | Full refresh |
| Revisiting the initial URI | Yes | Assets re-fetched — stays in sync with any backend changes |

## Client Component

`AssetUpdater` is a React Client Component. Import it from the client entrypoint if you need the explicit client path (otherwise it's re-exported from `@axistaylor/nextpress` directly):

```tsx
import { AssetUpdater } from '@axistaylor/nextpress/client';
import type { AssetData } from '@axistaylor/nextpress/client';
```

## Related

- [GlobalStyles](./global-styles.md) — Server-side global stylesheet rendering
- [Stylesheets](./stylesheets.md) — Enqueued stylesheets with marker tags
- [WPHead](./wp-head.md) / [WPFooter](./wp-footer.md) — Enqueued scripts with marker tags
- [WordPress Plugin](../wordpress-plugin.md) — `globalStyles` query consumed by `fetchAssets`
