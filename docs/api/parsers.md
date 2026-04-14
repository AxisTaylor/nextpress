<!--
title: "Content Parsers"
description: "Built-in and custom parsers for transforming WordPress HTML content in the Content component."
author: "AxisTaylor, LLC"
keywords: "NextPress, Content, parsers, custom parser, next/image, URL rewriting, WordPress, headless"
-->

# Content Parsers

The [`Content`](./content.md) component accepts a `parsers` prop — an array of functions that can transform individual HTML elements during rendering. Parsers run in order; the first parser to return a JSX element wins.

## Using Parsers

```tsx
import { Content, nextImageParser } from '@axistaylor/nextpress';

<Content
  content={wpContent}
  parsers={[nextImageParser]}
/>
```

Multiple parsers run in order:

```tsx
<Content
  content={wpContent}
  parsers={[nextImageParser, myCustomParser]}
/>
```

## Built-in Parsers

### `nextImageParser`

**Import:** `import { nextImageParser } from '@axistaylor/nextpress'`

Converts WordPress `<img>` tags to Next.js `<Image>` components for automatic WebP/AVIF optimization and responsive srcset generation.

- Passes intrinsic `width`/`height` for aspect ratio
- Passes WordPress's `sizes` attribute for responsive srcset selection
- Preserves `className`, `style`, and `data-*` attributes
- Skips images without `width`/`height` (leaves them as native `<img>`)

```tsx
import { Content, nextImageParser } from '@axistaylor/nextpress';

export default function Page({ content }) {
  return <Content content={content} parsers={[nextImageParser]} />;
}
```

> **Note:** `nextImageParser` imports from `next/image` which is a client component, so it must be imported from `@axistaylor/nextpress/client`. Your Next.js config must include [`remotePatterns`](https://nextjs.org/docs/app/api-reference/components/image#remotepatterns) for your WordPress domain.

### `createUrlRewritingParser`

**Import:** `import { createUrlRewritingParser } from '@axistaylor/nextpress'`

Factory function that creates a parser to rewrite WordPress internal URLs to Next.js routes and render links with a custom component (e.g. `next/link` for client-side navigation). This is used internally by `Content` when `formatPermalinks` is enabled (the default) — you don't need to add it manually unless you want to customize the behavior.

#### Basic Usage

```ts
import { createUrlRewritingParser } from '@axistaylor/nextpress';
import Link from 'next/link';

const parser = createUrlRewritingParser({
  wpHomeUrl: 'https://wordpress.example.com',
  wpSiteUrl: 'https://wordpress.example.com/wp',
  LinkComponent: Link,
  bypassExternalLinks: false,
});
```

#### Usage with `getWPInstance`

When using `withWCR`, you can read the WordPress URLs from the instance configuration instead of hardcoding them:

```ts
import { createUrlRewritingParser, getWPInstance } from '@axistaylor/nextpress';
import Link from 'next/link';

const { wpHomeUrl, wpSiteUrl } = getWPInstance('default');

const parser = createUrlRewritingParser({
  wpHomeUrl,
  wpSiteUrl,
  LinkComponent: Link,
  bypassExternalLinks: true,
});
```

#### Options (`UrlRewritingParserOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wpHomeUrl` | `string` | — | WordPress home URL to strip from links (e.g. `https://wordpress.example.com`) |
| `wpSiteUrl` | `string` | — | WordPress site URL to strip from links (e.g. `https://wordpress.example.com/wp`) |
| `LinkComponent` | `FC` | `'a'` | Component to use for links (e.g. `next/link` for client-side navigation) |
| `bypassExternalLinks` | `boolean` | `false` | If true, external links (`http://...`) are left as native `<a>` tags |

## Instance Configuration Helpers

These server-side utilities read the WordPress instance configuration that `withWCR` injects via the `NEXTPRESS_WP_INSTANCES` environment variable.

### `getWPInstance(slug)`

**Import:** `import { getWPInstance } from '@axistaylor/nextpress'`

Returns the configuration for a specific WordPress instance. Throws if the slug isn't found.

> **Client-side usage:** By default, `getWPInstance` only works server-side. To use it in client components, set `instancesReadableOnClient: true` in your [`withWCR` options](./with-wcr.md#instancesreadableonclient).

```ts
import { getWPInstance } from '@axistaylor/nextpress';

const { wpDomain, wpProtocol, wpHomeUrl, wpSiteUrl } = getWPInstance('default');
```

#### Return Type (`WPInstance`)

| Property | Type | Description |
|----------|------|-------------|
| `wpDomain` | `string` | WordPress domain (e.g. `wordpress.example.com`) |
| `wpProtocol` | `string` | Protocol (e.g. `https`) |
| `wpHomeUrl` | `string` | Full home URL (e.g. `https://wordpress.example.com`) |
| `wpSiteUrl` | `string` | Full site URL (e.g. `https://wordpress.example.com/wp`) |

### `getAllWPInstances()`

**Import:** `import { getAllWPInstances } from '@axistaylor/nextpress'`

Returns all configured WordPress instances as a `Record<string, WPInstance>`.

```ts
import { getAllWPInstances } from '@axistaylor/nextpress';

const instances = getAllWPInstances();
// { default: { wpDomain: '...', ... }, blog: { wpDomain: '...', ... } }
```

### `getInstanceSlugs()`

**Import:** `import { getInstanceSlugs } from '@axistaylor/nextpress'`

Returns an array of all configured instance slugs.

```ts
import { getInstanceSlugs } from '@axistaylor/nextpress';

const slugs = getInstanceSlugs();
// ['default', 'blog']
```

## Writing Custom Parsers

A parser is a function with the signature:

```ts
type CustomParser = (
  node: DOMNode,
  props: ElementProps,
  children?: DOMNode[] | DOMNode
) => JSX.Element | undefined;
```

- **Return a JSX element** to replace the node
- **Return `undefined`** to skip (let the next parser or default rendering handle it)

### Example: Custom Video Parser

```tsx
import type { CustomParser } from '@axistaylor/nextpress';

const videoParser: CustomParser = (node, props) => {
  const el = node as unknown as { name?: string };
  if (el.name !== 'video') return undefined;

  const p = props as Record<string, unknown>;
  return (
    <video
      src={p.src as string}
      controls
      playsInline
      className="rounded-lg w-full"
    />
  );
};

// Use it:
<Content content={content} parsers={[videoParser]} />
```

## Migration from `parser` to `parsers`

The single `parser` prop is deprecated. Migrate by wrapping in an array:

```tsx
// Before (deprecated)
<Content content={content} parser={myParser} />

// After
<Content content={content} parsers={[myParser]} />
```

Both props work simultaneously for backwards compatibility — `parsers` run before `parser`.

## Related

- [Content](./content.md) — The component that uses parsers
- [WPHead](./wp-head.md) — Head assets
