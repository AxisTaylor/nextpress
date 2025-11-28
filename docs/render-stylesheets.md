# RenderStylesheets

The `RenderStylesheets` component renders WordPress stylesheets with proper dependency ordering, inline styles, and media query support.

## Basic Usage

```tsx
import { RenderStylesheets } from '@axistaylor/nextpress';

export default function Layout({ children, stylesheets }) {
  return (
    <html>
      <head>
        <RenderStylesheets stylesheets={stylesheets} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stylesheets` | `EnqueuedStylesheet[]` | Yes | Array of WordPress stylesheets to render |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |

## Placement

RenderStylesheets should be placed in the `<head>` element of your layout, typically before HeadScripts:

```tsx
// app/(wordpress)/layout.tsx
export default async function WordPressLayout({ children }) {
  const { stylesheets, scripts } = await fetchAssets(uri);

  return (
    <html>
      <head>
        <RenderStylesheets stylesheets={stylesheets} />
        <HeadScripts scripts={headerScripts} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Features

### Dependency Ordering

Stylesheets are rendered in the correct order based on their dependencies:

```tsx
const stylesheets = [
  { handle: 'base-styles', dependencies: [] },
  { handle: 'theme-styles', dependencies: ['base-styles'] },
];

// Renders base-styles before theme-styles
<RenderStylesheets stylesheets={stylesheets} />
```

### Inline Styles

RenderStylesheets supports WordPress inline styles:

- **`before`** - CSS rendered before the stylesheet link
- **`after`** - CSS rendered after the stylesheet link (commonly used for CSS variables)

```tsx
const stylesheet = {
  handle: 'theme-styles',
  src: 'https://example.com/style.css',
  before: ':root { --primary-color: blue; }',
  after: '.custom-class { color: var(--primary-color); }',
};
```

### Media Queries

The `media` attribute is preserved for conditional stylesheet loading:

```tsx
const stylesheet = {
  handle: 'print-styles',
  src: 'https://example.com/print.css',
  media: 'print', // Only loads for print
};
```

### Versioned URLs

Stylesheet versions are appended as query parameters for cache busting:

```tsx
const stylesheet = {
  handle: 'my-styles',
  src: 'https://example.com/style.css',
  version: '1.2.3',
};

// Renders as: https://example.com/style.css?ver=1.2.3
```

## GraphQL Query

Fetch stylesheets with this GraphQL query:

```graphql
query GetAssets($uri: String!) {
  uriAssets(uri: $uri) {
    stylesheets {
      handle
      src
      version
      media
      before
      after
      dependencies
    }
  }
}
```

## EnqueuedStylesheet Type

```ts
interface EnqueuedStylesheet {
  handle: string;
  src: string;
  version?: string;
  media?: string;
  before?: string;
  after?: string;
  dependencies?: string[];
}
```

## Multi-WordPress Support

When using multiple WordPress backends:

```tsx
<RenderStylesheets stylesheets={stylesheets} instance="shop" />
```

## Server Component

RenderStylesheets is a React Server Component, meaning:

- It renders on the server
- No JavaScript is sent to the client for this component
- Stylesheets are included in the initial HTML response

## TypeScript

```tsx
import { RenderStylesheets } from '@axistaylor/nextpress';
import type { EnqueuedStylesheet } from '@axistaylor/nextpress';
```

## Related

- [HeadScripts](./head-scripts.md) - Header script loading
- [BodyScripts](./body-scripts.md) - Footer script loading
- [Getting Started](./getting-started.md) - Initial setup
