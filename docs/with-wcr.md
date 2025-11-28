# withWCR

`withWCR` is a Next.js configuration wrapper that sets up WordPress connection, generates API redirects, and configures environment variables.

## Basic Usage

```js
// next.config.mjs
import { withWCR } from '@axistaylor/nextpress/withWCR';

const nextConfig = {
  // Your existing Next.js config
};

export default withWCR(nextConfig, {
  wpDomain: 'your-wordpress.com',
  wpProtocol: 'https',
  frontendDomain: 'localhost:3000',
  frontendProtocol: 'http',
});
```

## Configuration Options

### Single WordPress Instance

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `wpDomain` | `string` | Yes | WordPress domain (without protocol) |
| `wpProtocol` | `'http' \| 'https'` | Yes | WordPress protocol |
| `wpHomeUrl` | `string` | No | WordPress home URL (defaults to `${wpProtocol}://${wpDomain}`) |
| `wpSiteUrl` | `string` | No | WordPress site URL (defaults to `wpHomeUrl`) |
| `frontendDomain` | `string` | Yes | Next.js frontend domain |
| `frontendProtocol` | `'http' \| 'https'` | Yes | Frontend protocol |

```js
export default withWCR(nextConfig, {
  wpDomain: 'wordpress.example.com',
  wpProtocol: 'https',
  // Optional: Override if WordPress is in a subdirectory
  wpHomeUrl: 'https://wordpress.example.com',
  wpSiteUrl: 'https://wordpress.example.com/wp', // Bedrock setup
  frontendDomain: 'app.example.com',
  frontendProtocol: 'https',
});
```

### Multi-WordPress Instance

For connecting to multiple WordPress backends:

```js
export default withWCR(nextConfig, {
  instances: {
    default: {
      wpDomain: 'main.example.com',
      wpProtocol: 'https',
    },
    blog: {
      wpDomain: 'blog.example.com',
      wpProtocol: 'https',
    },
    shop: {
      wpDomain: 'shop.example.com',
      wpProtocol: 'https',
      wpSiteUrl: 'https://shop.example.com/wp',
    },
  },
  frontendDomain: 'app.example.com',
  frontendProtocol: 'https',
});
```

See [Multi-WordPress Setup](./multi-wordpress.md) for complete documentation.

## What withWCR Does

### 1. Generates Redirects

Automatically creates Next.js redirects for WordPress API routes:

```js
// Generated redirects (simplified)
{
  source: '/?wc-ajax=:action',
  destination: '/atx/default/wc?wc-ajax=:action',
},
{
  source: '/?wp-ajax=:action',
  destination: '/atx/default/wp?wp-ajax=:action',
},
{
  source: '/wp-json/:path*',
  destination: '/atx/default/wp-json/:path*',
}
```

### 2. Sets Environment Variables

Injects WordPress configuration into environment variables:

```js
// Available in your app
process.env.NEXT_PUBLIC_FRONTEND_URL // Frontend URL
process.env.wcr_instances // JSON string of instance configs (Edge runtime)
```

### 3. Writes Config File

During build, writes a config file for Node.js runtime access:

```
.nextpress/config.json
```

### 4. Merges with Existing Config

Your existing Next.js configuration is preserved:

```js
const nextConfig = {
  images: {
    domains: ['example.com'],
  },
  async redirects() {
    return [
      { source: '/old', destination: '/new', permanent: true },
    ];
  },
};

// withWCR merges your redirects with WordPress redirects
export default withWCR(nextConfig, { /* ... */ });
```

## WordPress URL Configuration

### Standard WordPress

```js
{
  wpDomain: 'example.com',
  wpProtocol: 'https',
  // Defaults:
  // wpHomeUrl: 'https://example.com'
  // wpSiteUrl: 'https://example.com'
}
```

### WordPress in Subdirectory (Bedrock)

For WordPress installed in a subdirectory (common with Bedrock):

```js
{
  wpDomain: 'example.com',
  wpProtocol: 'https',
  wpHomeUrl: 'https://example.com',
  wpSiteUrl: 'https://example.com/wp', // WordPress core in /wp
}
```

### WordPress on Subdomain

```js
{
  wpDomain: 'cms.example.com',
  wpProtocol: 'https',
}
```

## TypeScript

```ts
import { withWCR } from '@axistaylor/nextpress/withWCR';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withWCR(nextConfig, {
  wpDomain: 'example.com',
  wpProtocol: 'https',
  frontendDomain: 'localhost:3000',
  frontendProtocol: 'http',
});
```

## Related

- [proxyByWCR](./proxy-by-wcr.md) - Middleware proxy setup
- [Multi-WordPress Setup](./multi-wordpress.md) - Multiple backends
- [Getting Started](./getting-started.md) - Initial setup
