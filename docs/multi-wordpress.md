# Multi-WordPress Setup

NextPress supports connecting to multiple WordPress backends from a single Next.js application. This is useful for:

- Microservices architecture (separate WordPress for blog, shop, docs)
- Multi-tenant applications
- Gradual migrations between WordPress instances

## Configuration

### withWCR Setup

Configure multiple instances in your Next.js config:

```js
// next.config.mjs
import { withWCR } from '@axistaylor/nextpress/withWCR';

const nextConfig = {};

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
      wpSiteUrl: 'https://shop.example.com/wp', // Bedrock setup
    },
  },
  frontendDomain: 'app.example.com',
  frontendProtocol: 'https',
});
```

### Instance Options

Each instance accepts the same options as single-instance configuration:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `wpDomain` | `string` | Yes | WordPress domain |
| `wpProtocol` | `'http' \| 'https'` | Yes | Protocol |
| `wpHomeUrl` | `string` | No | Home URL (defaults to `protocol://domain`) |
| `wpSiteUrl` | `string` | No | Site URL (defaults to `wpHomeUrl`) |

## Using Instances

### In Components

Pass the `instance` prop to specify which WordPress backend to use:

```tsx
import { Content } from '@axistaylor/nextpress';
import { HeadScripts, BodyScripts } from '@axistaylor/nextpress/client';
import { RenderStylesheets } from '@axistaylor/nextpress';

// Use the blog instance
<Content content={content} instance="blog" />
<HeadScripts scripts={scripts} instance="blog" />
<BodyScripts scripts={scripts} instance="blog" />
<RenderStylesheets stylesheets={stylesheets} instance="blog" />
```

### Default Instance

If no `instance` prop is provided, components use `'default'`:

```tsx
// These are equivalent
<Content content={content} />
<Content content={content} instance="default" />
```

## Route-Based Instances

Organize your app with route groups for each WordPress instance:

```
app/
├── (main)/              # Default WordPress instance
│   ├── layout.tsx
│   └── [[...uri]]/
│       └── page.tsx
├── (blog)/              # Blog WordPress instance
│   ├── layout.tsx
│   └── [[...uri]]/
│       └── page.tsx
└── (shop)/              # Shop WordPress instance
    ├── layout.tsx
    └── [[...uri]]/
        └── page.tsx
```

### Example: Blog Layout

```tsx
// app/(blog)/layout.tsx
import { HeadScripts, BodyScripts } from '@axistaylor/nextpress/client';
import { RenderStylesheets } from '@axistaylor/nextpress';
import { headers } from 'next/headers';
import { fetchAssets } from '@/lib/wordpress';

const INSTANCE = 'blog';

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const uri = headersList.get('x-uri') || '/';

  const { scripts, stylesheets } = await fetchAssets(uri, INSTANCE);

  const headerScripts = scripts.filter((s) => s.location === 'HEADER');
  const footerScripts = scripts.filter((s) => s.location === 'FOOTER');

  return (
    <html lang="en">
      <head>
        <RenderStylesheets stylesheets={stylesheets} instance={INSTANCE} />
        <HeadScripts scripts={headerScripts} instance={INSTANCE} />
      </head>
      <body>
        {children}
        <BodyScripts scripts={footerScripts} instance={INSTANCE} />
      </body>
    </html>
  );
}
```

### Example: Multi-Instance GraphQL Utility

```ts
// lib/wordpress.ts
const GRAPHQL_ENDPOINTS: Record<string, string> = {
  default: 'https://main.example.com/graphql',
  blog: 'https://blog.example.com/graphql',
  shop: 'https://shop.example.com/graphql',
};

export async function fetchAssets(uri: string, instance: string = 'default') {
  const endpoint = GRAPHQL_ENDPOINTS[instance];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query GetAssets($uri: String!) {
          uriAssets(uri: $uri) {
            scripts { ... }
            stylesheets { ... }
          }
        }
      `,
      variables: { uri },
    }),
  });

  const { data } = await response.json();
  return {
    scripts: data?.uriAssets?.scripts || [],
    stylesheets: data?.uriAssets?.stylesheets || [],
  };
}
```

## Proxy Routing

The proxy automatically routes requests based on the instance slug in the URL:

```
/atx/default/wp-json/wp/v2/posts  → main.example.com
/atx/blog/wp-json/wp/v2/posts     → blog.example.com
/atx/shop/wc?wc-ajax=add_to_cart  → shop.example.com
```

No additional proxy configuration is needed - just ensure your `proxy.ts` matcher includes the instance pattern:

```ts
export const config = {
  matcher: [
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-json/:path*',
    '/atx/:instance/wp-assets/:path*',
    // ...
  ],
};
```

## Asset URL Rewriting

Assets are automatically rewritten to use the correct proxy path:

```
// Original WordPress URL
https://blog.example.com/wp-content/uploads/image.jpg

// Rewritten for proxy
/atx/blog/wp-assets/wp-content/uploads/image.jpg
```

This happens automatically when you pass the `instance` prop to components.

## Environment-Based Configuration

For different instances per environment:

```js
// next.config.mjs
const instances = {
  default: {
    wpDomain: process.env.WP_DOMAIN_DEFAULT,
    wpProtocol: process.env.WP_PROTOCOL || 'https',
  },
  blog: {
    wpDomain: process.env.WP_DOMAIN_BLOG,
    wpProtocol: process.env.WP_PROTOCOL || 'https',
  },
};

export default withWCR(nextConfig, {
  instances,
  frontendDomain: process.env.FRONTEND_DOMAIN,
  frontendProtocol: process.env.FRONTEND_PROTOCOL || 'https',
});
```

## Accessing Instance Configuration

### In Server Components

```ts
import { getWPInstance } from '@axistaylor/nextpress';

const instance = getWPInstance('blog');
// { wpDomain, wpProtocol, wpHomeUrl, wpSiteUrl }
```

### In Client Components

Instance configuration is available through the proxy URL pattern - client components don't need direct access to configuration.

## Best Practices

1. **Use consistent instance names** - Keep names short and descriptive (`blog`, `shop`, `docs`)

2. **Organize by route groups** - Use Next.js route groups to separate instances

3. **Share utilities** - Create shared GraphQL utilities that accept instance parameter

4. **Handle errors gracefully** - Check for valid instance before making requests

5. **Consider caching** - Each instance may have different caching requirements

## Related

- [withWCR](./with-wcr.md) - Configuration options
- [proxyByWCR](./proxy-by-wcr.md) - Proxy setup
- [Getting Started](./getting-started.md) - Initial setup
