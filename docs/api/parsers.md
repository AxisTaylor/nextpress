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
  parsers={[nextImageParser()]}
/>
```

Multiple parsers run in order:

```tsx
<Content
  content={wpContent}
  parsers={[nextImageParser(), myCustomParser]}
/>
```

## Built-in Parsers

### `nextImageParser`

**Import:** `import { nextImageParser } from '@axistaylor/nextpress'`

Factory that returns a parser converting WordPress `<img>` tags into Next.js `<Image>` components for automatic WebP/AVIF optimization and responsive srcset generation.

- Resolves the matching WordPress instance via [`getWPInstance`](#getwpinstanceslug) / [`getAllWPInstances`](#getallwpinstances) and rewrites same-host `<img>` src values through the NextPress asset proxy (`/atx/{slug}/wp-assets/...`). Consumers don't need to configure [`images.remotePatterns`](https://nextjs.org/docs/app/api-reference/components/image#remotepatterns) for their WordPress origin.
- Cross-origin images (CDNs, external embeds) pass through unchanged.
- Converts WordPress `<img>` attributes into a Next.js `Image`-compatible prop shape via [`toImageProps`](#toimagepropsattrs-src) — `width`, `height`, `sizes`, `loading`, `fetchPriority` → `priority`, `crossOrigin`, `referrerPolicy`, `data-*`, plus pass-through of `className`, `style`, `title`, and `id`.
- Skips images without `width`/`height` (leaves them as native `<img>`).

```tsx
import { Content, nextImageParser } from '@axistaylor/nextpress';

export default function Page({ content }) {
  return <Content content={content} parsers={[nextImageParser({ instance: 'default' })]} />;
}
```

#### Options (`NextImageParserOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `instance` | `string` | `'default'` | The `withWCR` instance slug to resolve src URLs against. The matching instance's `wpHomeUrl` decides what's "same-host" (proxied) vs external (passed through). |
| `render` | `ComponentType<ImageProps>` | `next/image`'s `Image` | Component the parser renders for each matched `<img>`. Receives the converted `ImageProps`. Use this to wrap or replace `<Image>` with your own component — e.g. one that applies app-wide image styling — without losing the proxy / prop-conversion behaviour. |

#### Curating a parser with a custom render component

The `render` prop is the recommended way to centralize image presentation. Anything the consumer wants every WP image to ship with — rounded corners, default `sizes`, a blur placeholder strategy, an overlay click handler, etc. — lives once on the wrapping component:

```tsx
import Image, { type ImageProps } from 'next/image';
import { nextImageParser } from '@axistaylor/nextpress';

function ArticleImage(props: ImageProps) {
  return (
    <Image
      {...props}
      className={`rounded-xl shadow-md ${props.className ?? ''}`}
      sizes={props.sizes ?? '(min-width: 768px) 720px, 100vw'}
    />
  );
}

const articleImageParser = nextImageParser({
  instance: 'default',
  render: ArticleImage,
});

<Content content={post.content} parsers={[articleImageParser]} />
```

### `toImageProps(attrs, src)`

**Import:** `import { toImageProps } from '@axistaylor/nextpress'`

Pure helper that converts an `<img>` element's parsed `attributesToProps` output into a [`next/image` `ImageProps`](https://nextjs.org/docs/app/api-reference/components/image) object using the supplied `src`. Returns `null` when the attribute set is missing `width`/`height`. Re-use this if you're writing a fully custom image parser but still want the attribute-mapping behaviour the built-in parser provides.

```ts
import type { CustomParser } from '@axistaylor/nextpress';
import { toImageProps } from '@axistaylor/nextpress';

const myImageParser: CustomParser = (node, attrs) => {
  if ((node as { name?: string }).name !== 'img') return undefined;
  const src = (attrs as Record<string, unknown>).src as string;
  const props = toImageProps(attrs, src);
  if (!props) return undefined;
  return <MyImage {...props} />;
};
```

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
