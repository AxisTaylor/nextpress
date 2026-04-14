<!--
title: "@axistaylor/nextpress"
description: "A comprehensive toolkit for rendering WordPress Gutenberg content 1:1 in Next.js applications."
author: "AxisTaylor, LLC"
keywords: "NextPress, Next.js, WordPress, Gutenberg, WPGraphQL, headless CMS, content rendering, Interactivity API"
-->

<p align="center">
  <img src="../logo.svg" alt="@axistaylor/nextpress" width="120" />
</p>

# @axistaylor/nextpress

A comprehensive toolkit for rendering WordPress Gutenberg content 1:1 in Next.js applications.

## Table of Contents

### Guides
- [Getting Started](./getting-started.md) — Installation, setup, and your first WordPress page
- [Multi-WordPress Setup](./multi-wordpress.md) — Connect to multiple WordPress backends
- [WordPress Plugin](./wordpress-plugin.md) — Companion plugin for enhanced functionality
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions

### API Reference
- [API Overview](./api/README.md) — Complete API reference
- [WPHead](./api/wp-head.md) — Render all head assets (global styles, stylesheets, import map, scripts)
- [WPFooter](./api/wp-footer.md) — Render footer scripts
- [Content](./api/content.md) — Render WordPress HTML content with custom parsers
- [Parsers](./api/parsers.md) — Built-in parsers (`nextImageParser`, `createUrlRewritingParser`) and custom parser guide
- [Page Events](./api/page-events.md) — WordPress script lifecycle events in headless environments
- [WPScripts](./api/wp-scripts.md) — Core script renderer (classic, deferred, async, module)
- [ImportMap](./api/import-map.md) — Script module import map for the Interactivity API
- [AssetUpdater](./api/asset-updater.md) — Client-side asset refresh on navigation
- [withWCR](./api/with-wcr.md) — Next.js configuration wrapper
- [proxyByWCR](./api/proxy-by-wcr.md) — Middleware proxy for WordPress APIs

## Quick Links

- [npm package](https://www.npmjs.com/package/@axistaylor/nextpress)
- [GitHub repository](https://github.com/axistaylor/nextpress)
- [WordPress plugin](./wordpress-plugin.md)

## Introduction

NextPress bridges the gap between WordPress and Next.js, enabling you to render Gutenberg content with pixel-perfect accuracy in your React applications. It handles the complexities of WordPress scripts, styles, block markup, and the Interactivity API so you can focus on building your application.

### Key Features

- **1:1 Content Rendering** — Render WordPress Gutenberg blocks exactly as they appear on your WordPress site
- **Script Modules & Interactivity API** — Full support for `viewScriptModule` blocks, ES module import maps, and `@wordpress/interactivity`
- **Script Management** — Load WordPress scripts with proper dependency resolution, deferred/async strategies, and synthetic page events for DOMContentLoaded compatibility
- **Style Handling** — Global styles, scoped block stylesheets, and `core-block-supports` layout CSS
- **Image Optimization** — Optional `nextImageParser` converts WordPress images to `next/image` for WebP/AVIF
- **Multi-site Support** — Connect to multiple WordPress backends with automatic cross-origin proxy routing
- **WordPress Plugin** — Companion plugin for GraphQL asset queries, script module registry, and URL transforms

### How It Works

NextPress provides a set of React components and Next.js utilities that work together to fetch and render WordPress content:

1. **WPHead** — Renders all `<head>` assets in one component: global styles, stylesheets, import map, and header scripts
2. **WPFooter** — Renders footer scripts with proper load strategies
3. **Content** — Parses and renders WordPress HTML content with customizable parsers (URL rewriting, image optimization, custom element handling)
4. **AssetUpdater** — Keeps assets in sync on client-side navigation and fires synthetic page events
5. **withWCR / proxyByWCR** — Next.js configuration and middleware for secure WordPress API communication

Get started by following the [Getting Started guide](./getting-started.md).
