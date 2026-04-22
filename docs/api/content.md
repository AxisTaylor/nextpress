<!--
title: "Content Component"
description: "Render WordPress HTML content in React with layout classes, automatic scoping, and custom parsers."
author: "AxisTaylor, LLC"
keywords: "NextPress, Content component, WordPress, Gutenberg, HTML rendering, React, contentCssClasses"
-->

# Content Component

The `Content` component renders WordPress HTML content in React, automatically handling Gutenberg blocks, HTML entities, table structures, and WordPress layout classes.

## Basic Usage

```tsx
import { Content } from '@axistaylor/nextpress';

export default function Page({ content, contentCssClasses }: {
  content: string;
  contentCssClasses: string[];
}) {
  return <Content content={content} contentCssClasses={contentCssClasses} />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | — | WordPress HTML content to render |
| `contentCssClasses` | `string[]` | `[]` | Layout classes from the WP template (see [Content CSS](../content-css.md)) |
| `parsers` | `CustomParser[]` | `[]` | Array of custom parser functions (see [Parsers](./parsers.md)) |
| `linksAs` | `FC` | `'a'` | Component for rendering links (e.g. `next/link`) |
| `instance` | `string` | `'default'` | WordPress instance slug |
| `bypassExternalLinks` | `boolean` | `false` | Leave external links as native `<a>` tags |
| `parser` | `CustomParser` | — | **Deprecated.** Use `parsers` instead |

## How It Works

The `Content` component:

1. **Wraps output in `[data-rendered]`** — Parsed HTML is rendered inside `<div data-rendered>`. This attribute is the scope root that [GlobalStyles](./global-styles.md) and [Stylesheets](./stylesheets.md) use to isolate WordPress CSS from your application styling.
2. **Applies layout classes** — When `contentCssClasses` is provided, an inner wrapper `<div>` receives the WP layout classes (`is-layout-constrained`, `has-global-padding`, etc.) so WordPress layout spacing and content-width constraints work correctly.
3. **Parses HTML** — Uses `html-react-parser` to convert HTML string to React elements.
4. **Fixes Tables** — Wraps table rows in `<tbody>` if missing (required by React).
5. **Rewrites URLs** — Internal WordPress links are rewritten to Next.js routes when `formatPermalinks` is enabled (the default).

## Fetching Content with Layout Classes

The `contentCssClasses` field is registered on the WPGraphQL `ContentNode` interface by the NextPress WordPress plugin. It returns the CSS classes WordPress would apply to the post-content wrapper based on the template's layout attribute.

```graphql
query GetPage($uri: String!) {
  nodeByUri(uri: $uri) {
    ... on Page {
      content
      contentCssClasses
    }
    ... on Post {
      content
      contentCssClasses
    }
  }
}
```

### Full Page Example

```tsx
// app/(wordpress)/[[...uri]]/page.tsx
import { Content } from '@axistaylor/nextpress';
import { nextImageParser } from '@axistaylor/nextpress/client';
import Link from 'next/link';

async function fetchContent(uri: string) {
  const res = await fetch(process.env.GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query ($uri: String!) {
        nodeByUri(uri: $uri) {
          ... on Page { content contentCssClasses }
          ... on Post { content contentCssClasses }
        }
      }`,
      variables: { uri },
    }),
  });
  const { data } = await res.json();
  return data?.nodeByUri;
}

export default async function Page({ params }: { params: Promise<{ uri?: string[] }> }) {
  const { uri: segments } = await params;
  const uri = '/' + (segments?.join('/') || '');
  const node = await fetchContent(uri);

  if (!node?.content) return null;

  return (
    <Content
      content={node.content}
      contentCssClasses={node.contentCssClasses}
      linksAs={Link}
      parsers={[nextImageParser]}
    />
  );
}
```

## Layout Classes

WordPress block templates define a layout on the `core/post-content` block (e.g. `{"layout":{"type":"constrained"}}`). This generates CSS classes that control content width, padding, and spacing. Without these classes, your headless content will lack the layout constraints the theme intends.

| Class | Condition | Purpose |
|-------|-----------|---------|
| `is-layout-constrained` | `type: "constrained"` | Max-width + auto-margin on children |
| `is-layout-flow` | `type: "flow"` (default) | Block flow layout |
| `is-layout-flex` | `type: "flex"` | Flexbox layout |
| `is-layout-grid` | `type: "grid"` | Grid layout |
| `has-global-padding` | Constrained + `useRootPaddingAwareAlignments` | Root padding |
| `wp-block-post-content-is-layout-*` | Always | Block-specific layout hook |
| `is-vertical` / `is-horizontal` | `orientation` set | Flex/grid direction |
| `is-content-justification-*` | `justifyContent` set | Content alignment |
| `is-nowrap` | `flexWrap: "nowrap"` | Prevent flex wrapping |

See [Content CSS](../content-css.md) for a full guide on getting WordPress content to render correctly.

## Custom Parsers

See [Parsers](./parsers.md) for details on `parsers`, `nextImageParser`, and `createUrlRewritingParser`.

## Multi-WordPress Support

When using multiple WordPress backends, specify the instance:

```tsx
<Content content={content} contentCssClasses={cssClasses} instance="blog" />
```

See [Multi-WordPress Setup](../multi-wordpress.md) for configuration details.

## Related

- [Content CSS](../content-css.md) — Full guide to rendering WordPress content CSS correctly
- [Parsers](./parsers.md) — Built-in and custom content parsers
- [GlobalStyles](./global-styles.md) — Theme.json global styles
- [Stylesheets](./stylesheets.md) — WordPress enqueued stylesheets
- [WPHead](./wp-head.md) — Head assets (combines GlobalStyles + Stylesheets + scripts)
