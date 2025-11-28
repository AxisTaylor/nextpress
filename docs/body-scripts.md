# BodyScripts

The `BodyScripts` component renders WordPress footer scripts with proper dependency resolution, loading strategies, and inline script support.

## Basic Usage

```tsx
import { BodyScripts } from '@axistaylor/nextpress/client';

export default function Layout({ children, scripts }) {
  const footerScripts = scripts.filter(s => s.location === 'FOOTER');

  return (
    <html>
      <head>{/* ... */}</head>
      <body>
        {children}
        <BodyScripts scripts={footerScripts} />
      </body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scripts` | `EnqueuedScript[]` | Yes | Array of WordPress scripts to render |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |

## Optimal Placement

**BodyScripts should be placed at the end of the `<body>` element in your root layout.** This ensures:

- Page content loads first
- Scripts don't block initial rendering
- Footer scripts execute after DOM is ready
- Consistent script loading across all pages

```tsx
// app/(wordpress)/layout.tsx
export default async function WordPressLayout({ children }) {
  // ... fetch scripts
  const footerScripts = scripts.filter(s => s.location === 'FOOTER');

  return (
    <html>
      <head>{/* ... */}</head>
      <body>
        <main>{children}</main>
        <BodyScripts scripts={footerScripts} />
      </body>
    </html>
  );
}
```

## Retrieving URI in Layouts

BodyScripts needs to know the current URI to load the correct scripts. See [HeadScripts - Retrieving URI in Layouts](./head-scripts.md#retrieving-uri-in-layouts) for the complete setup guide.

**Quick summary:**

1. Configure `proxy.ts` to set `x-uri` header for page routes
2. Ensure the matcher includes your page routes
3. Read the header in your layout using `headers().get('x-uri')`

```tsx
// app/(wordpress)/layout.tsx
import { headers } from 'next/headers';

export default async function WordPressLayout({ children }) {
  const headersList = await headers();
  const uri = headersList.get('x-uri') || '/';

  const { scripts } = await fetchAssets(uri);
  const footerScripts = scripts.filter(s => s.location === 'FOOTER');

  return (
    <html>
      <head>{/* ... */}</head>
      <body>
        {children}
        <BodyScripts scripts={footerScripts} />
      </body>
    </html>
  );
}
```

## Footer vs Header Scripts

WordPress scripts have a `location` field indicating where they should load:

| Location | Component | When to Use |
|----------|-----------|-------------|
| `HEADER` | `HeadScripts` | Critical scripts needed immediately |
| `FOOTER` | `BodyScripts` | Scripts that can wait until after content loads |

```tsx
// Filter scripts by location
const headerScripts = scripts.filter(s => s.location === 'HEADER');
const footerScripts = scripts.filter(s => s.location === 'FOOTER');
```

Most WordPress scripts are enqueued in the footer for better performance.

## Script Loading Strategies

BodyScripts respects WordPress script loading strategies:

| Strategy | Behavior |
|----------|----------|
| `DEFER` | Script loads after HTML parsing |
| `ASYNC` | Script loads asynchronously |
| `BLOCKING` | Script blocks rendering (rare for footer scripts) |

## Dependency Resolution

Scripts are automatically sorted by dependencies, ensuring scripts load in the correct order:

```tsx
// If script-b depends on script-a, script-a renders first
const scripts = [
  { handle: 'script-a', dependencies: [] },
  { handle: 'script-b', dependencies: ['script-a'] },
];
```

## Inline Scripts & Extra Data

BodyScripts handles WordPress inline scripts:

- **`before`** - Inline script before the main script
- **`after`** - Inline script after the main script
- **`extraData`** - Localized data (from `wp_localize_script`)

## Multi-WordPress Support

When using multiple WordPress backends:

```tsx
<BodyScripts scripts={footerScripts} instance="shop" />
```

## TypeScript

```tsx
import { BodyScripts } from '@axistaylor/nextpress/client';
import type { EnqueuedScript } from '@axistaylor/nextpress';
```

## Related

- [HeadScripts](./head-scripts.md) - Header script loading and URI retrieval
- [RenderStylesheets](./render-stylesheets.md) - Stylesheet loading
- [Getting Started](./getting-started.md) - Initial setup
