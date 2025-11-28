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
- `HeadScripts` / `BodyScripts` - Load WordPress scripts with dependency resolution
- `RenderStylesheets` - Load WordPress stylesheets with inline styles
- `withWCR` - Next.js configuration wrapper
- `proxyByWCR` - Middleware proxy for WordPress APIs

### [NextPress WordPress Plugin](./packages/wordpress) - WordPress Plugin

Add the GitHub repository to your `composer.json`:

```json
{
  "repositories": [
    {
      "type": "git",
      "url": "https://github.com/AxisTaylor/nextpress.git"
    }
  ]
}
```

Then require the package:

```bash
composer require axistaylor/nextpress:dev-main
```

Extends WPGraphQL with queries for enqueued scripts and stylesheets.

## Documentation

See the [docs](./docs/README.md) for detailed guides:

- [Getting Started](./docs/getting-started.md)
- [WordPress Plugin](./docs/wordpress-plugin.md)
- [Content Component](./docs/content.md)
- [HeadScripts / BodyScripts](./docs/head-scripts.md)
- [withWCR Configuration](./docs/with-wcr.md)
- [proxyByWCR Middleware](./docs/proxy-by-wcr.md)

## Requirements

- Node.js 18+
- Next.js 14.2.5+
- WordPress 6.0+
- PHP 7.4+
- WPGraphQL 1.27.0+

## License

- NPM Package: MIT
- WordPress Plugin: GPL-3.0-or-later
