<!--
title: "NextPress API Reference"
description: "Complete API reference for NextPress components, utilities, and configuration options."
author: "AxisTaylor, LLC"
keywords: "NextPress, API reference, Content, GlobalStyles, HeadScripts, BodyScripts, WPScripts, ImportMap, AssetUpdater, PageEvents, withWCR, proxyByWCR"
-->

# API Reference

Complete reference for all NextPress exports.

## Server Components

| Export | Description |
|--------|-------------|
| [Content](./content.md) | Render WordPress HTML content with custom parsers (wraps output in `[data-rendered]`) |
| [GlobalStyles](./global-styles.md) | Render the WordPress global stylesheet, custom CSS, and font faces (scoped to `[data-rendered]`) |
| [Stylesheets](./stylesheets.md) | Load WordPress enqueued stylesheets with inline styles |
| [HeadScripts](./head-scripts.md) | Head asset wrapper: GlobalStyles + ImportMap + header scripts |
| [BodyScripts](./body-scripts.md) | Body asset wrapper: footer scripts |
| [WPScripts](./wp-scripts.md) | Core script renderer (classic, deferred, async, ES module) |
| [ImportMap](./import-map.md) | Script module import map (`@wordpress/interactivity`, etc.) |

## Client Components

| Export | Description |
|--------|-------------|
| [AssetUpdater](./asset-updater.md) | Refresh server-rendered assets on client-side navigation (includes page events) |
| [PageEvents](./page-events.md) | Fire synthetic WordPress lifecycle events (standalone, for apps not using AssetUpdater) |

## Hooks

| Export | Description |
|--------|-------------|
| [`usePageEvents`](./page-events.md#usepageevents-hook) | Hook to fire synthetic DOMContentLoaded/load events on mount and pathname change |

## Configuration

| Export | Description |
|--------|-------------|
| [withWCR](./with-wcr.md) | Next.js configuration wrapper |
| [proxyByWCR](./proxy-by-wcr.md) | Middleware proxy for WordPress APIs |

## Quick Import Reference

```tsx
// Server components
import {
  Content,
  GlobalStyles,
  Stylesheets,
  HeadScripts,
  BodyScripts,
  WPScripts,
  ImportMap,
} from '@axistaylor/nextpress';

// Client components & hooks
import {
  AssetUpdater,
  PageEvents,
  usePageEvents,
  firePageEvents,
} from '@axistaylor/nextpress/client';
import type { AssetData } from '@axistaylor/nextpress/client';

// Configuration (separate entry points)
import { withWCR } from '@axistaylor/nextpress/withWCR';
import { proxyByWCR } from '@axistaylor/nextpress/proxyByWCR';

// Types
import type {
  CustomParserCallback,
  GlobalStylesType,
  EnqueuedScript,
  EnqueuedStylesheet,
  ScriptTypeEnum,
  WPImport,
} from '@axistaylor/nextpress';
```

## Related

- [Getting Started](../getting-started.md) - Installation and setup
- [Multi-WordPress Setup](../multi-wordpress.md) - Multiple backend configuration
