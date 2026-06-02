<!--
title: "GlobalStyles Component"
description: "Server-render the WordPress global stylesheet, custom CSS, and font faces into the document head, scoped to the NextPress content wrapper."
author: "AxisTaylor, LLC"
keywords: "NextPress, GlobalStyles, WordPress, theme.json, global stylesheet, font faces, custom CSS, @scope"
-->

# GlobalStyles

The `GlobalStyles` component renders the WordPress global stylesheet (from `wp_get_global_stylesheet()`), theme-registered font faces (`wp_print_font_faces()`), and any Customizer custom CSS into the document `<head>`. All rules are automatically scoped to the NextPress content wrapper (`[data-rendered]`) so they apply only to WordPress content and do not leak into your application's chrome (navbar, footer, etc.).

## Basic Usage

```tsx
import { GlobalStyles } from '@axistaylor/nextpress';

export default async function WordPressLayout({ children }) {
  const uri = (await headers()).get('x-uri') || '/';
  const globalStyles = await fetchGlobalStyles();

  return (
    <html>
      <head>
        <GlobalStyles globalStyles={globalStyles} pathname={uri} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `globalStyles` | `GlobalStylesType \| null` | Yes | Payload from the `globalStyles` GraphQL query |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |
| `pathname` | `string` | No | Current page pathname; used when resolving proxy URL placeholders in font-face rules |
| `deferFonts` | `boolean` | No | Defer the `@font-face` block off the critical path. Default `true`. See [Deferring fonts](#deferring-fonts). |
| `deferGlobalStyles` | `boolean` | No | Defer the theme.json `stylesheet` content. Default `false` — opt in only when you can absorb a token-flash on first paint. |
| `skipFonts` | `boolean` | No | Skip the `@font-face` block entirely. Default `false`. Set when the host app loads its own webfonts (e.g. via [`next/font`](https://nextjs.org/docs/app/api-reference/components/font)) and doesn't want the WP-proxied font-face declarations re-injected. See [Skipping fonts](#skipping-fonts). |

## Deferring fonts

By default `deferFonts: true` renders the `@font-face` `<style>` tag with `media="print" data-np-defer="1"` and emits a short inline script that swaps `media` to `"all"` once the rules are parsed. Lighthouse stops counting font-face declarations against "Eliminate render-blocking resources" without any visible regression — text above the fold paints with the system fallback (per `font-display: swap`) and re-paints with the web font as soon as it's downloaded, same as without the defer.

Set `deferFonts={false}` if text above the fold uses glyphs that don't exist in any system fallback (icon fonts, custom symbol fonts), where rendering with the fallback would show `□` boxes instead of the intended character.

## Skipping fonts

`skipFonts: true` suppresses the `@font-face` `<style>` block entirely — no `<style id="nextpress-font-faces">` element, no swap-script. Use this when the host application already loads its own webfonts and doesn't need the WordPress-proxied declarations on the page. The canonical case is a Next.js app that loads matching families via [`next/font/google`](https://nextjs.org/docs/app/api-reference/components/font/google):

```tsx
import { Source_Serif_4, Onest } from 'next/font/google';

const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-family-serif' });
const sans  = Onest({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-family-sans' });

export default function Layout({ children }) {
  return (
    <html className={`${serif.variable} ${sans.variable}`}>
      <head>
        <WPHead globalStyles={globalStyles} skipFonts /* ...other props */ />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`skipFonts` takes precedence over `deferFonts`: when both are set, the block is skipped (not just deferred). Theme.json `stylesheet` content and `customCss` are still rendered — `skipFonts` only scopes to the font-face block.

## Deferring globalStyles

`deferGlobalStyles: false` (the default) keeps the theme.json `stylesheet` content (CSS custom property bindings + base block-supports rules) on the critical path. Set to `true` only when you can absorb a token-flash on first paint — for example, when the application chrome paints its own values via your design system before any WordPress block is visible.

## GraphQL Query

```graphql
query GetGlobalStyles {
  globalStyles {
    stylesheet
    customCss
    renderedFontFaces
  }
}
```

| Field | Description |
|-------|-------------|
| `stylesheet` | Output of `wp_get_global_stylesheet()` — theme.json presets, layout styles, block defaults |
| `customCss` | Customizer custom CSS (`wp_get_custom_css()`) |
| `renderedFontFaces` | Output of `wp_print_font_faces()` for theme-registered web fonts |

## How It Works

For each piece of global CSS, `GlobalStyles` renders a dedicated `<style data-nextpress="global">` tag in `<head>`:

1. **Font faces** — `renderedFontFaces` is stripped of its WordPress-generated `<style>` wrapper and passed through proxy-placeholder substitution so font URLs resolve through your NextPress proxy. Rendered as `<style id="nextpress-font-faces">`.
2. **Global stylesheet** — `stylesheet` is piped through `scopeStylesheet()` which wraps everything in `@scope ([data-rendered])`, rewrites `body`/`html`/`:root` selectors to `&`, and hoists pure-variable `:root { --… }` blocks globally so custom properties cascade document-wide. Rendered as `<style id="nextpress-global-styles">`.
3. **Custom CSS** — `customCss` is scoped the same way and rendered as `<style id="nextpress-custom-css">`.

Every element is tagged with `data-nextpress="global"` so the [AssetUpdater](./asset-updater.md) can locate and refresh them on client-side navigation.

## Scoping Behavior

The scoped output looks roughly like:

```css
/* Pure-variable :root blocks are extracted and emitted globally. */
:root { --wp--preset--color--base: #fff; /* … */ }

@scope ([data-rendered]) {
  & { background-color: var(--wp--preset--color--base); /* from body { … } */ }
  & :where(.wp-element-button) { color: var(--wp--preset--color--base); }
  /* …the rest of the theme.json output, scoped to descendants of [data-rendered] */
}
```

Everything that originally targeted `body`, `html`, or `:root` now targets the scope root; everything else is implicitly scoped to descendants of `[data-rendered]`. This isolates WordPress theme styles from the application layout while keeping CSS custom properties available document-wide.

## Tailwind Preflight Interaction

The scoped global stylesheet relies on rules like `:where(.wp-element-button) { color: var(--wp--preset--color--base) }` which use zero-specificity `:where()` selectors. If your app uses Tailwind with the default Preflight layer active on the same routes, Preflight's `a { color: inherit }` / `button { … }` resets can outrank these WordPress rules and produce the wrong colors or spacing on content that sits inside `[data-rendered]` — most visibly on WooCommerce cart and checkout buttons.

Use a dedicated Tailwind entrypoint for your WordPress route group (without Preflight), or extend Preflight to skip `[data-rendered]`. See [Troubleshooting → Tailwind Preflight Overriding WordPress Styles](../troubleshooting.md#tailwind-preflight-overriding-wordpress-styles) for the two recommended setups.

## Font URL Rewriting

If the WordPress plugin's **Enable Theme URL Transforms** setting is on, the `renderedFontFaces` payload contains `http://__NEXTPRESS_ASSETS__/…` placeholders instead of the raw WordPress origin. `GlobalStyles` resolves these on the server via `replaceProxyPlaceholders(content, instance, pathname)` so fonts load through `/atx/{instance}/wp-assets/…` on the frontend and avoid CORS failures.

## Server Component

`GlobalStyles` is a React Server Component — no client JavaScript, no hydration work, and the scoped CSS is part of the initial HTML payload. Use [AssetUpdater](./asset-updater.md) alongside it if you need the styles to refresh on client-side navigation to a pathname with a different theme/custom CSS output.

## TypeScript

```tsx
import { GlobalStyles } from '@axistaylor/nextpress';
import type { GlobalStylesType } from '@axistaylor/nextpress';
```

## Related

- [AssetUpdater](./asset-updater.md) — Refresh global styles (and scripts/stylesheets) on navigation
- [Stylesheets](./stylesheets.md) — Per-URI enqueued stylesheets
- [Content](./content.md) — Renders the `[data-rendered]` wrapper these styles are scoped to
- [WordPress Plugin](../wordpress-plugin.md) — `globalStyles` query and `enable_theme_url_transforms` setting
