<p align="center">
  <img src="./logo.svg" alt="NextPress" width="120" />
</p>

# NextPress

[![npm version](https://img.shields.io/npm/v/@axistaylor/nextpress.svg)](https://www.npmjs.com/package/@axistaylor/nextpress)
[![WordPress Plugin Version](https://img.shields.io/github/v/tag/AxisTaylor/nextpress?filter=wp-v*&label=wordpress%20plugin)](https://github.com/AxisTaylor/nextpress/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./packages/js/LICENSE)
[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](./packages/wordpress/LICENSE)

Render WordPress Gutenberg content 1:1 in Next.js. Automatic script/stylesheet loading, middleware proxy, and multi-WordPress support.

## Packages

### [@axistaylor/nextpress](./packages/js) - NPM Package

```bash
npm install @axistaylor/nextpress
```

Components and utilities for rendering WordPress content in Next.js:
- `Content` - Render WordPress HTML content with custom parsers
- `HeadScripts` / `BodyScripts` - Load WordPress scripts via `next/script` (server components)
- `Stylesheets` - Load WordPress stylesheets with inline styles (server component)
- `withWCR` - Next.js configuration wrapper
- `proxyByWCR` - Middleware proxy for WordPress APIs

### [NextPress WordPress Plugin](./packages/wordpress) - WordPress Plugin

```bash
composer require axistaylor/nextpress
```

Published on [Packagist](https://packagist.org/packages/axistaylor/nextpress) as a `wordpress-plugin` type, so Composer-managed WordPress installs (Bedrock or any setup with `composer/installers`) drop it into `wp-content/plugins/nextpress/` automatically. For non-Composer sites, download `nextpress.zip` from the [Releases page](https://github.com/AxisTaylor/nextpress/releases?q=wp-v) and upload it via **Plugins → Add New → Upload Plugin**. Full install options in the [WordPress Plugin docs](./docs/wordpress-plugin.md#installation).

Extends WPGraphQL with `assetsByUri`, `globalStyles`, and `templateByUri` queries for headless Next.js frontends.

## Documentation

See the [docs](./docs/README.md) for detailed guides:

- [Getting Started](./docs/getting-started.md)
- [WordPress Plugin](./docs/wordpress-plugin.md)
- [Content Component](./docs/api/content.md)
- [HeadScripts](./docs/api/head-scripts.md)
- [BodyScripts](./docs/api/body-scripts.md)
- [Stylesheets](./docs/api/stylesheets.md)
- [withWCR Configuration](./docs/api/with-wcr.md)
- [proxyByWCR Middleware](./docs/api/proxy-by-wcr.md)

## Requirements

- Node.js 18+
- Next.js 14.2.5+
- WordPress 6.0+
- PHP 7.4+
- WPGraphQL 1.27.0+

## License

- NPM Package: MIT
- WordPress Plugin: GPL-3.0-or-later
