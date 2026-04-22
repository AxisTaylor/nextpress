<!--
title: "NextPress API Reference"
description: "Complete API reference for NextPress components, parsers, hooks, and configuration."
author: "AxisTaylor, LLC"
keywords: "NextPress, API reference, WPHead, WPFooter, WPScripts, Content, ImportMap, AssetUpdater, PageEvents, parsers, withWCR, proxyByWCR"
-->

# API Reference

Complete reference for all NextPress exports.

## Server Components

| Export | Description |
|--------|-------------|
| [WPHead](./wp-head.md) | Renders all `<head>` assets: global styles, stylesheets, import map, and header scripts |
| [WPFooter](./wp-footer.md) | Renders footer/body scripts |
| [Content](./content.md) | Renders WordPress HTML content with layout classes and custom parsers (wraps output in `[data-rendered]`) |

### Lower-Level Components

These are used internally by `WPHead` / `WPFooter`. Available for advanced use cases but not needed in most apps:

| Export | Description |
|--------|-------------|
| [WPScripts](./wp-scripts.md) | Core script renderer (classic, deferred, async, ES module) |
| [GlobalStyles](./global-styles.md) | WordPress global stylesheet, custom CSS, and font faces |
| [Stylesheets](./stylesheets.md) | WordPress enqueued stylesheets with inline styles |
| [ImportMap](./import-map.md) | Script module import map (`@wordpress/interactivity`, etc.) |

## Client Components

| Export | Description |
|--------|-------------|
| [AssetUpdater](./asset-updater.md) | Refreshes assets on client-side navigation (includes synthetic page events) |
| [PageEvents](./page-events.md) | Fires synthetic WordPress lifecycle events (for apps not using AssetUpdater) |

## Parsers

| Export | Import Path | Description |
|--------|-------------|-------------|
| [`nextImageParser`](./parsers.md#nextimageparser) | `@axistaylor/nextpress/client` | Converts `<img>` to `next/image` for WebP/AVIF optimization |
| [`createUrlRewritingParser`](./parsers.md#createurlrewritingparser) | `@axistaylor/nextpress` | Rewrites WordPress URLs to Next.js routes (used internally by Content) |

## Hooks

| Export | Import Path | Description |
|--------|-------------|-------------|
| [`usePageEvents`](./page-events.md#usepageevents-hook) | `@axistaylor/nextpress/client` | Fires synthetic DOMContentLoaded/load events on mount and pathname change |
| [`firePageEvents`](./page-events.md#firepageevents-utility) | `@axistaylor/nextpress/client` | Imperative function to dispatch page events |

## Configuration

| Export | Import Path | Description |
|--------|-------------|-------------|
| [withWCR](./with-wcr.md) | `@axistaylor/nextpress/withWCR` | Next.js configuration wrapper |
| [proxyByWCR](./proxy-by-wcr.md) | `@axistaylor/nextpress/proxyByWCR` | Middleware proxy for WordPress APIs |

## Quick Import Reference

```tsx
// Server components (render in <head> and <body>)
import { WPHead, WPFooter, Content } from '@axistaylor/nextpress';

// Client components, hooks, and parsers
import {
  AssetUpdater,
  PageEvents,
  usePageEvents,
  firePageEvents,
  nextImageParser,
} from '@axistaylor/nextpress/client';
import type { AssetData } from '@axistaylor/nextpress/client';

// Configuration (separate entry points)
import { withWCR } from '@axistaylor/nextpress/withWCR';
import { proxyByWCR } from '@axistaylor/nextpress/proxyByWCR';

// Types
import type {
  CustomParser,
  GlobalStylesType,
  EnqueuedScript,
  EnqueuedStylesheet,
  ScriptTypeEnum,
} from '@axistaylor/nextpress';
import type { WPImport } from '@axistaylor/nextpress';
```

## Related

- [Getting Started](../getting-started.md) — Installation and setup
- [Parsers](./parsers.md) — Content parsers (nextImageParser, custom parsers)
- [Page Events](./page-events.md) — WordPress script lifecycle in headless environments
- [Multi-WordPress Setup](../multi-wordpress.md) — Multiple backend configuration
