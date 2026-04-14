<!--
title: "Page Events"
description: "Fire synthetic WordPress lifecycle events so scripts can initialize in a headless Next.js environment."
author: "AxisTaylor, LLC"
keywords: "NextPress, PageEvents, DOMContentLoaded, usePageEvents, WordPress scripts, headless, lifecycle events"
-->

# Page Events

## The Problem

WordPress frontend scripts commonly initialize by listening for `DOMContentLoaded`:

```js
document.addEventListener('DOMContentLoaded', () => {
  // Find block elements and set up interactivity
  document.querySelectorAll('.my-block').forEach(initBlock);
});
```

In a traditional WordPress page, this works because scripts load with `defer` — they execute after the DOM is parsed but before `DOMContentLoaded` fires.

In a Next.js headless environment, scripts loaded via `next/script` with `afterInteractive` (the strategy used for WordPress deferred scripts) execute **after** React hydration, which is **after** `DOMContentLoaded` has already fired. The scripts register their listener but the event never comes — and the blocks never initialize.

## The Solution

NextPress fires **synthetic page lifecycle events** after hydration so WordPress scripts get the signals they expect:

- `DOMContentLoaded` on `document`
- `load` on `window`
- `nextpress:page-change` custom event on `document`

These fire:
1. **On initial mount** — so scripts that missed the real `DOMContentLoaded` can initialize
2. **On client-side navigation** — so scripts can re-initialize for new page content

## Using AssetUpdater (Recommended)

If you're using [`AssetUpdater`](./asset-updater.md), page events are fired automatically — you don't need `PageEvents` or `usePageEvents`. AssetUpdater fires events on initial mount and after each asset refresh on navigation.

```tsx
// This is all you need — page events are built in
<AssetUpdater fetchAssets={fetchAssetsAction} />
```

## PageEvents Component

For apps that don't use AssetUpdater (e.g. static sites, or layouts where assets don't change between pages), use the `PageEvents` client component:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { PageEvents } from '@axistaylor/nextpress/client';

export function MyPageEvents() {
  const pathname = usePathname();
  return <PageEvents pathname={pathname} />;
}
```

Then in your layout:

```tsx
<BodyScripts scripts={scripts} pathname={uri} />
<MyPageEvents />
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pathname` | `string` | Yes | Current page pathname — triggers events on change |

## usePageEvents Hook

For more control, use the `usePageEvents` hook directly in your own client component:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { usePageEvents } from '@axistaylor/nextpress/client';

export function MyComponent() {
  const pathname = usePathname();
  usePageEvents(pathname);

  // Your component logic...
  return <div>...</div>;
}
```

The hook fires events:
- On initial mount (via `queueMicrotask` so React hydration completes first)
- On every `pathname` change

## firePageEvents Utility

For imperative use (e.g. after dynamically loading content):

```ts
import { firePageEvents } from '@axistaylor/nextpress/client';

// After inserting new WordPress content into the DOM
firePageEvents();
```

## Events Dispatched

| Event | Target | Purpose |
|-------|--------|---------|
| `DOMContentLoaded` | `document` | Standard DOM event — most WP scripts listen for this |
| `load` | `window` | Window load event — some scripts wait for full page load |
| `nextpress:page-change` | `document` | NextPress-specific event for scripts that want to distinguish real page loads from synthetic re-fires |

## Writing Compatible Scripts

If you're authoring WordPress blocks that need to work in both traditional and headless environments, use the readyState pattern:

```js
function initMyBlock() {
  document.querySelectorAll('.my-block').forEach(/* ... */);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMyBlock);
} else {
  initMyBlock();
}
```

This works on traditional WordPress (where `defer` scripts run before `DOMContentLoaded`) AND on headless Next.js (where the script may load after `DOMContentLoaded` but NextPress will also re-fire it).

## Related

- [AssetUpdater](./asset-updater.md) — Includes page events automatically
- [WPScripts](./wp-scripts.md) — How scripts are rendered in head/body
- [HeadScripts](./head-scripts.md) — Head asset wrapper
