<!--
title: "NextPress API Reference"
description: "Complete API reference for NextPress components, utilities, and configuration options."
author: "AxisTaylor, LLC"
keywords: "NextPress, API reference, Content, GlobalStyles, HeadScripts, BodyScripts, AssetUpdater, withWCR, proxyByWCR"
-->

# API Reference

Complete reference for all NextPress exports.

## Server Components

| Export | Description |
|--------|-------------|
| [Content](./content.md) | Render WordPress HTML content with custom parsers (wraps output in `[data-rendered]`) |
| [GlobalStyles](./global-styles.md) | Render the WordPress global stylesheet, custom CSS, and font faces (scoped to `[data-rendered]`) |
| [Stylesheets](./stylesheets.md) | Load WordPress enqueued stylesheets with inline styles |
| [HeadScripts](./head-scripts.md) | Load WordPress header scripts with dependency resolution |
| [BodyScripts](./body-scripts.md) | Load WordPress footer scripts |

## Client Components

| Export | Description |
|--------|-------------|
| [AssetUpdater](./asset-updater.md) | Refresh server-rendered stylesheets, scripts, and global styles on client-side navigation |

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
} from '@axistaylor/nextpress';

// Client components
import { AssetUpdater } from '@axistaylor/nextpress/client';
import type { AssetData } from '@axistaylor/nextpress/client';

// Configuration (separate entry points)
import { withWCR } from '@axistaylor/nextpress/withWCR';
import { proxyByWCR } from '@axistaylor/nextpress/proxyByWCR';

// Types
import type { CustomParserCallback, GlobalStylesType } from '@axistaylor/nextpress';
```

## Related

- [Getting Started](../getting-started.md) - Installation and setup
- [Multi-WordPress Setup](../multi-wordpress.md) - Multiple backend configuration
