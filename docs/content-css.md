<!--
title: "Content CSS"
description: "How to render WordPress content with correct styling in a headless Next.js application without breaking your app's own styles."
author: "AxisTaylor, LLC"
keywords: "NextPress, CSS scoping, WordPress styles, headless, Tailwind, GlobalStyles, Stylesheets, content layout"
-->

# Content CSS

This guide explains how NextPress renders WordPress content CSS in a headless Next.js application and what you need to set up so the content looks the same as it does on the WordPress backend.

## The Problem

WordPress outputs its own CSS: global styles from `theme.json`, per-block stylesheets, layout spacing rules, and custom theme styles. When you render WordPress content inside a Next.js application, those styles must:

1. **Apply correctly** to the WordPress content.
2. **Not leak** into your application's navbar, footer, and other non-WordPress UI.
3. **Not be overridden** by your application's CSS framework (e.g. Tailwind's Preflight resets).

NextPress solves this with **CSS scoping** via `@scope ([data-rendered])` and a set of components that work together to load, scope, and render WordPress styles.

## How It Works

### The `[data-rendered]` Boundary

The [`Content`](./api/content.md) component wraps all WordPress HTML in `<div data-rendered>`. This element is the **scope root** — all WordPress CSS is wrapped in `@scope ([data-rendered]) { ... }` so it only applies inside this boundary.

```html
<!-- Your app chrome — unaffected by WordPress CSS -->
<nav>...</nav>

<!-- WordPress content — scoped styles apply here -->
<div data-rendered>
  <div class="is-layout-constrained has-global-padding">
    <h1 class="wp-block-heading has-5-xl-font-size">...</h1>
    <p>...</p>
  </div>
</div>

<!-- Your app chrome — unaffected by WordPress CSS -->
<footer>...</footer>
```

### Component Responsibilities

| Component | What It Renders | Scoping |
|-----------|----------------|---------|
| [**GlobalStyles**](./api/global-styles.md) | Theme.json stylesheet, custom CSS, font faces | Scoped via `@scope ([data-rendered])`. `:root` variable-only blocks are extracted and kept global. |
| [**Stylesheets**](./api/stylesheets.md) | Per-page enqueued stylesheets (`<link>` tags) and their inline additions (`before`/`after` data) | Inline CSS is scoped. Linked stylesheets load as external `<link>` tags (unscoped). |
| [**WPHead**](./api/wp-head.md) | Combines GlobalStyles + Stylesheets + ImportMap + head scripts in one component | Convenience wrapper; delegates to the above. |
| [**Content**](./api/content.md) | WordPress HTML content inside `[data-rendered]` with layout classes | Provides the scope root element. |

### CSS Variable Extraction

WordPress's `theme.json` defines CSS custom properties (e.g. `--wp--preset--font-size--5-xl: var(--text-5xl)`) that must be accessible at `:root` level. When NextPress scopes inline CSS, it:

1. **Extracts** `:root` blocks that contain only `--variable: value` declarations.
2. **Preserves** their `@layer` wrapper (e.g. `@layer theme { :root { ... } }`) for correct layer ordering.
3. **Emits** them outside the `@scope` so they remain on `:root`.

This ensures the variable chain resolves: `--wp--preset--font-size--5-xl` → `var(--text-5xl)` → `3rem`.

### Specificity Preservation

WordPress uses `:root` as a specificity bump in layout rules like:

```css
:root :where(.is-layout-constrained) > * {
  margin-block-start: 24px;
  margin-block-end: 0;
}
```

The `:root` selector gives this rule specificity 0,1,0, which it needs to override block-level `margin` shorthands. When scoping, NextPress rewrites `:root` to `:scope` (not `&`), which preserves the 0,1,0 specificity inside `@scope`.

### Cascade Layers

`@scope` isolates WordPress styles to `[data-rendered]`, but inside the scope NextPress still has to keep three classes of WP-derived CSS from fighting each other:

1. **Proxied stylesheet files** from `assetsByUri` (`wp-block-library`, plugin/theme CSS files) — the lowest-priority foundation.
2. **`globalStyles.stylesheet` + `customCss`** — the theme.json-derived design tokens that should override the foundation.
3. **Inline `before`/`after` payloads** from `assetsByUri` (per-instance `core-block-supports` container rules, dynamic plugin styles) — per-page overrides that should win over both.

To enforce that ordering NextPress declares two cascade layers near the top of the head:

```css
@layer wp-base, wp-theme;
```

…and routes each class of WP CSS into the appropriate tier:

| Source | Path | Wrapping |
|--------|------|----------|
| Proxied `.css` files (any `assetsByUri` handle with a `src`) | `proxyByWCR.ts` | `@layer wp-base { @scope ([data-rendered]) { … } }` |
| `globalStyles.stylesheet` + `customCss` | `GlobalStyles.tsx`, `AssetUpdater.updateGlobalStyles` | `@layer wp-theme { @scope ([data-rendered]) { … } }` |
| `before` / `after` inline content on any `assetsByUri` handle | `Stylesheets.tsx`, `AssetUpdater.updateStylesheets` | `@scope ([data-rendered]) { … }` — unlayered |
| App CSS (Tailwind, your `globals.css`) | n/a | unlayered |
| Inline `style="…"` attributes | n/a | always wins |

CSS Cascade Layers L5 says unlayered author rules beat any layered author rules, and later-declared layers beat earlier ones. So the resulting cascade priority is:

```
wp-base  <  wp-theme  <  unlayered (Stylesheets + app CSS)  <  inline style="…"
```

This makes per-instance block-supports CSS (e.g. an editor-set `style.spacing.blockGap` on a `core/columns` block) reliably override the matching theme.json default — even when both rules have the same selector specificity and the theme.json rule appears later in the document.

#### Differentiation Is Source-Based, Never Handle-Based

NextPress never branches on specific WP handle names (e.g. `core-block-supports`, `wp-block-library`). The layering only looks at *which payload field* a chunk of CSS came from — `globalStyles` field, `assetsByUri` external file, or `assetsByUri` inline `before`/`after`. Any WP setup that exposes those fields gets the correct cascade for free; classic themes, FSE block themes, plugin-only sites, and headless-first installs all work without nextpress needing to know what's installed.

#### Nested `@layer` Inside Proxied Files

A proxied `.css` file may already contain its own `@layer` rules (Tailwind v4 emits `@layer theme { … }`, plugin bundles may use `@layer base, components, utilities;`). When `scopeStylesheet(css, { layer: 'wp-base' })` wraps that file, the result is:

```css
@layer wp-base {
  @scope ([data-rendered]) {
    @layer theme { /* original file's layer */ }
    .unlayered-rule { /* original file's unlayered rule */ }
  }
}
```

Per CSS Cascade L5, `@layer theme` becomes a sublayer named `wp-base.theme`. Two consequences:

- Internal ordering within the file is preserved (relative `foo` vs `bar` order inside the file is kept as `wp-base.foo` vs `wp-base.bar`).
- Anything that was unlayered in the original file becomes the implicit outer of `wp-base`, capping its maximum priority at the `wp-base` tier. A plugin that previously used unlayered CSS to override theme.json defaults loses that ability — that's intentional. Plugin CSS that genuinely needs to win against theme.json should be exposed as inline `before`/`after` (via `wp_add_inline_style()`), which stays unlayered.

#### Variables Are Never Layered

`:root` (or `:host`) blocks that contain only `--variable: value` declarations are extracted *before* the `@layer` wrap and emitted at the top level. CSS custom properties are inherited values resolved via the element's ancestor chain, not via the cascade between competing declarations — so they stay global so that `var()` references inside any layer (or outside any layer) resolve correctly.

The extractor preserves a `:root` block's original `@layer` wrapper if it had one (e.g. Tailwind's `@layer theme { :root, :host { --vars } }`) so the file's internal layer registration order isn't lost.

#### Why `global-styles` Is Skipped Server-Side

WordPress's `wp_enqueue_global_styles()` adds `wp_get_global_stylesheet()` as inline-after content on the `global-styles` handle — duplicating the same content that NextPress already exposes through the dedicated `globalStyles.stylesheet` GraphQL field. If both reached the browser, the unlayered Stylesheets copy would beat the `@layer wp-theme` copy and per-instance overrides would never win.

To prevent that, NextPress's WP plugin filters the `global-styles` handle out of the enqueued queue in `WP_Assets::flatten_enqueued_assets_list()`. The theme.json content still reaches the frontend via `globalStyles.stylesheet`; the unlayered duplicate just disappears.

## What You Need to Set Up

### 1. WordPress Block Theme

Your WordPress theme should be a block theme with a `theme.json` that defines:

- **Color palette** with CSS variable references (e.g. `"color": "var(--primary)"`)
- **Font size presets** referencing theme variables (e.g. `"size": "var(--text-5xl)"`)
- **Layout settings** (`contentSize`, `wideSize`, `useRootPaddingAwareAlignments`)
- **Templates** with `core/post-content` block using a layout attribute:

```html
<!-- templates/page.html -->
<!-- wp:template-part {"slug":"header","area":"header"} /-->
<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:post-content {"layout":{"type":"constrained"}} /-->
</main>
<!-- /wp:group -->
<!-- wp:template-part {"slug":"footer","area":"footer"} /-->
```

The `{"layout":{"type":"constrained"}}` on `post-content` is what generates the layout classes that NextPress exposes via the `contentCssClasses` GraphQL field.

#### Theme CSS with Tailwind

If your theme uses Tailwind CSS, the compiled `style.css` should define all design tokens in `@theme` blocks:

```css
/* src/style.css */
@import "tailwindcss";

@theme {
  --font-family-sans: 'Roboto', system-ui, sans-serif;
  --font-family-serif: 'Libre Franklin', Georgia, serif;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  /* ... all size/spacing/color tokens ... */
  --color-primary: oklch(0.328 0.068 257.3);
  --color-primary-foreground: oklch(0.935 0.043 137.9);
}

:root {
  --primary: var(--color-primary);
  --primary-foreground: var(--color-primary-foreground);
  /* ... semantic mappings ... */
}

.dark {
  --primary: var(--color-primary-light);
  /* ... dark mode overrides ... */
}
```

These variables flow through to `theme.json` presets. When NextPress scopes the theme stylesheet's inline CSS, the `@layer theme { :root { ... } }` block is extracted and kept at `:root` level, making the variables available to WordPress's global styles.

### 2. Next.js CSS Setup

Your Next.js routes that render WordPress content should use a CSS file that **omits Tailwind's Preflight** to avoid overriding WordPress's element-level styles inside `[data-rendered]`.

```css
/* app/wordpress.css */

/* Import Tailwind theme + utilities only — no Preflight */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

/* Your theme tokens and brand colors */
@import "./brand.css";

/* Scoped normalization: resets for app chrome only */
@layer base {
  *,
  ::before,
  ::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
  }

  /* Resets OUTSIDE [data-rendered] — WordPress controls its own defaults */
  :is(h1, h2, h3, h4, h5, h6, p, blockquote, dl, dd, figure, pre):not([data-rendered] *) {
    margin: 0;
  }

  :is(ol, ul, menu):not([data-rendered] *) {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Anchor reset outside WordPress content only */
  a:not([data-rendered] *) {
    color: inherit;
    text-decoration: inherit;
  }
}
```

Import this in your WordPress layout instead of your regular `globals.css`:

```tsx
// app/(wordpress)/layout.tsx
import './wordpress.css'; // NOT globals.css

export default async function WordPressLayout({ children }) {
  // ...
}
```

Non-WordPress routes (e.g. account pages, docs) can continue using `globals.css` with full Tailwind Preflight.

### 3. Layout Component

Your WordPress layout should use `WPHead` and `WPFooter` to load all assets, and pass `contentCssClasses` to the `Content` component:

```tsx
// app/(wordpress)/layout.tsx
import { WPHead, WPFooter } from '@axistaylor/nextpress';
import { AssetUpdater } from '@axistaylor/nextpress/client';
import { headers } from 'next/headers';

export default async function WordPressLayout({ children }) {
  const uri = (await headers()).get('x-uri') || '/';
  const [{ stylesheets, scripts, importMap }, globalStyles] = await Promise.all([
    fetchAssets(uri),
    fetchGlobalStyles(),
  ]);

  return (
    <html lang="en">
      <head>
        <WPHead
          stylesheets={stylesheets}
          scripts={scripts}
          globalStyles={globalStyles}
          importMap={importMap}
          pathname={uri}
        />
      </head>
      <body>
        <nav>/* Your app navbar */</nav>
        <main>{children}</main>
        <footer>/* Your app footer */</footer>
        <WPFooter scripts={scripts} pathname={uri} />
        <AssetUpdater fetchAssets={fetchAssetsAction} />
      </body>
    </html>
  );
}
```

### 4. Page Component

Fetch both `content` and `contentCssClasses` and pass them to `Content`:

```tsx
// app/(wordpress)/[[...uri]]/page.tsx
import { Content } from '@axistaylor/nextpress';

export default async function Page({ params }) {
  const { uri: segments } = await params;
  const uri = '/' + (segments?.join('/') || '');

  const res = await fetch(GRAPHQL_ENDPOINT, {
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
  const node = data?.nodeByUri;
  if (!node?.content) return null;

  return (
    <Content
      content={node.content}
      contentCssClasses={node.contentCssClasses}
    />
  );
}
```

## Troubleshooting

### Font sizes are wrong

WordPress preset font sizes like `has-5-xl-font-size` depend on a variable chain: `--wp--preset--font-size--5-xl` → `var(--text-5xl)` → `3rem`. If the heading appears at the wrong size:

1. Check that `--text-5xl` is defined in your theme's compiled CSS inside `@layer theme { :root { ... } }`.
2. Verify the GlobalStyles component is rendering (it outputs the `--wp--preset--*` variables).
3. Ensure your theme.json `fontSizes` reference the same variable names as your theme CSS.

### Layout spacing is missing

Content appears flush with no gaps between blocks:

1. Verify `contentCssClasses` is being fetched and passed to `Content`. The field should return classes like `is-layout-constrained` and `has-global-padding`.
2. Check that your template's `core/post-content` block has a `layout` attribute: `<!-- wp:post-content {"layout":{"type":"constrained"}} /-->`.
3. Ensure `useRootPaddingAwareAlignments` is `true` in your theme.json settings.

### Tailwind resets override WordPress styles

Buttons, links, or headings inside WordPress content lose their styling:

- Use a Preflight-free CSS import (`wordpress.css`) for routes that render WordPress content. See [Step 2](#2-nextjs-css-setup) above.
- The `:not([data-rendered] *)` guard on normalization rules ensures resets only apply to your app chrome, not WordPress content.

### Block-level margins conflict with layout spacing

A block's `margin` shorthand overrides the layout's `margin-block-start`:

- NextPress rewrites `:root` to `:scope` inside `@scope` to preserve specificity. If you see layout spacing not working, check that `scopeStyles.ts` uses `:scope` (not `&`) for `:root` rewrites.

### A theme.json default for a block isn't overriding `wp-block-library` defaults

Theme.json output lives in `@layer wp-theme`; proxied `wp-block-library` CSS lives in `@layer wp-base`. wp-theme beats wp-base, so a theme.json `styles.blocks.<name>` rule should win — *unless* theme.json's emitted selector is less specific than the matching `wp-block-library` rule (e.g. `:scope :where(.X)` (0,1,0) vs `.wp-block-X.is-layout-flex` (0,2,0)). Increase the theme.json selector's specificity or override via a per-instance editor setting (which lands unlayered and wins regardless).

### A per-instance block setting isn't winning over a theme.json default

This is what cascade layers are for. If a `style.spacing.blockGap` (or padding/margin) set on a specific block in the editor isn't overriding the matching theme.json default:

1. Check that `settings.spacing.blockGap` (or padding/margin) is `true` in theme.json — without that flag, the editor doesn't emit per-instance overrides at all.
2. Confirm the per-instance rule appears in a `<style>` element WITHOUT an `@layer` wrapper. It should sit inside `@scope ([data-rendered]) { … }` but not inside any `@layer`. If it's accidentally inside `wp-theme`, the cascade won't bump it above the theme.json default.
3. Verify `WP_Assets::flatten_enqueued_assets_list()` is still skipping the `global-styles` handle. If that filter is missing, the duplicate unlayered copy of theme.json reaches the browser and beats the per-instance override.

## Related

- [Content](./api/content.md) — The Content component
- [GlobalStyles](./api/global-styles.md) — Theme.json global styles
- [Stylesheets](./api/stylesheets.md) — Enqueued stylesheet rendering
- [WPHead](./api/wp-head.md) — Head asset wrapper
- [Getting Started](./getting-started.md) — Initial setup guide
