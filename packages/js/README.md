# @axistaylor/nextpress

A comprehensive toolkit for rendering WordPress Gutenberg content 1:1 in Next.js applications. Includes automatic script and stylesheet loading, middleware proxy for WordPress APIs, and multi-WordPress instance support.

[![npm version](https://img.shields.io/npm/v/@axistaylor/nextpress.svg)](https://www.npmjs.com/package/@axistaylor/nextpress)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **1:1 WordPress Content Rendering** - Render Gutenberg blocks exactly as they appear in WordPress
- **Automatic Asset Loading** - Scripts and stylesheets with dependency resolution
- **Middleware Proxy** - Seamless WordPress REST API, admin-ajax.php, and WooCommerce integration
- **Multi-WordPress Support** - Connect to multiple WordPress backends
- **Server Components** - Full React Server Component support for optimal performance
- **TypeScript** - Complete type definitions included

## Quick Start

### 1. Install

```bash
npm install @axistaylor/nextpress
```

### 2. Configure Next.js

```js
// next.config.mjs
import { withWCR } from '@axistaylor/nextpress/withWCR';

const nextConfig = {};

export default withWCR(nextConfig, {
  wpDomain: 'your-wordpress.com',
  wpProtocol: 'https',
  frontendDomain: 'localhost:3000',
  frontendProtocol: 'http',
});
```

### 3. Add Middleware

```ts
// middleware.ts
import { proxyByWCR } from '@axistaylor/nextpress/proxyByWCR';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return proxyByWCR(request);
}

export const config = {
  matcher: [
    '/atx/:slug/wp-json/:path*',
    '/atx/:slug/wp',
    '/atx/:slug/wc',
    '/atx/:slug/wp-assets/:path*',
  ],
};
```

### 4. Create Layout with Scripts & Styles

```tsx
// app/(wordpress)/layout.tsx
import { HeadScripts, BodyScripts } from '@axistaylor/nextpress/client';
import { RenderStylesheets } from '@axistaylor/nextpress';
import { headers } from 'next/headers';
import { fetchAssets } from '@/lib/wordpress';

export default async function WordPressLayout({ children }) {
  const headersList = await headers();
  const uri = headersList.get('x-nextpress-uri') || '/';

  const { scripts, stylesheets } = await fetchAssets(uri);
  const headerScripts = scripts.filter(s => s.location === 'HEADER');
  const footerScripts = scripts.filter(s => s.location === 'FOOTER');

  return (
    <html>
      <head>
        <RenderStylesheets stylesheets={stylesheets} />
        <HeadScripts scripts={headerScripts} />
      </head>
      <body>
        {children}
        <BodyScripts scripts={footerScripts} />
      </body>
    </html>
  );
}
```

### 5. Render Content

```tsx
// app/(wordpress)/[...uri]/page.tsx
import { Content } from '@axistaylor/nextpress';
import { fetchPage } from '@/lib/wordpress';

export default async function Page({ params }) {
  const uri = '/' + (params.uri?.join('/') || '');
  const { content } = await fetchPage(uri);

  return <Content content={content} />;
}
```

## Documentation

For complete documentation, see the [docs folder](../../docs/):

- [Getting Started](../../docs/getting-started.md)
- [Content Component](../../docs/content.md)
- [HeadScripts & BodyScripts](../../docs/head-scripts.md)
- [RenderStylesheets](../../docs/render-stylesheets.md)
- [withWCR Configuration](../../docs/with-wcr.md)
- [proxyByWCR Middleware](../../docs/proxy-by-wcr.md)
- [Multi-WordPress Setup](../../docs/multi-wordpress.md)
- [WordPress Plugin](../../docs/wordpress-plugin.md)
- [Troubleshooting](../../docs/troubleshooting.md)

## Requirements

- Next.js 14.2.5+
- React 18.3.1+
- WordPress with WPGraphQL plugin
- NextPress WordPress plugin

## Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements.

- Read the [Contributing Guide](../../CONTRIBUTING.md)
- Check out [open issues](https://github.com/axistaylor/nextpress/issues)
- Submit a [Pull Request](https://github.com/axistaylor/nextpress/pulls)

## License

MIT
