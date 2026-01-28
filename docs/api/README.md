<!--
title: "NextPress API Reference"
description: "Complete API reference for NextPress components, utilities, and configuration options."
author: "AxisTaylor, LLC"
keywords: "NextPress, API reference, Content, HeadScripts, BodyScripts, withWCR, proxyByWCR"
-->

# API Reference

Complete reference for all NextPress exports.

## Components

| Export | Description |
|--------|-------------|
| [Content](./content.md) | Render WordPress HTML content with custom parsers |
| [HeadScripts](./head-scripts.md) | Load WordPress header scripts with dependency resolution |
| [BodyScripts](./body-scripts.md) | Load WordPress footer scripts |
| [RenderStylesheets](./render-stylesheets.md) | Load WordPress stylesheets with inline styles |

## Configuration

| Export | Description |
|--------|-------------|
| [withWCR](./with-wcr.md) | Next.js configuration wrapper |
| [proxyByWCR](./proxy-by-wcr.md) | Middleware proxy for WordPress APIs |

## Quick Import Reference

```tsx
// Components
import { Content, HeadScripts, BodyScripts, RenderStylesheets } from '@axistaylor/nextpress';

// Configuration (separate entry points)
import { withWCR } from '@axistaylor/nextpress/withWCR';
import { proxyByWCR } from '@axistaylor/nextpress/proxyByWCR';

// Types
import type { CustomParserCallback } from '@axistaylor/nextpress';
```

## Related

- [Getting Started](../getting-started.md) - Installation and setup
- [Multi-WordPress Setup](../multi-wordpress.md) - Multiple backend configuration
