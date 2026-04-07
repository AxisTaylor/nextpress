---
"@axistaylor/nextpress": minor
"@axistaylor/nextpress-wordpress": minor
---

Add `globalStyles` query, client-side asset refresh, and scoped WordPress CSS.

**WordPress plugin (`@axistaylor/nextpress-wordpress`)**

- Add `globalStyles` GraphQL query exposing `stylesheet`, `customCss`, and `renderedFontFaces` from `wp_get_global_stylesheet()` / `wp_print_font_faces()` (ported from snapwp-helper).
- Refactor schema registration into `includes/graphql/{types,dataloaders,models,utils}` with separate `includes()` and `register_schema()` phases; rename `Model` → `Uri_Assets` and `Dataloader` → `Uri_Assets_Loader`.
- Add `enable_theme_url_transforms` setting that, when enabled, rewrites `theme_file_uri`/`stylesheet_directory_uri`/`template_directory_uri` to `__NEXTPRESS_ASSETS__` placeholders in the global styles response so the consuming app can route fonts and theme assets through its proxy.
- Extract shared `simulate_and_collect_assets()` helper so both `UriAssets` and rendered-template resolvers share the same asset collection path.

**JavaScript package (`@axistaylor/nextpress`)**

- New `<GlobalStyles>` server component that emits the scoped global stylesheet, font faces, and custom CSS in `<head>`, tagged with `data-nextpress="global"`.
- New `<AssetUpdater>` client component that refreshes server-rendered stylesheets, scripts, and global styles on client-side navigation by clearing marker-delimited regions (`nextpress-stylesheets-*`, `nextpress-head-scripts-*`, `nextpress-body-scripts-*`) and re-inserting fresh assets. Scripts are inserted sequentially with execution order preserved, and inline scripts resolve via a generic event-dispatch wrapper so handle-specific follow-ups (e.g. `processWcSettings` for `wc-settings`) fire only after the inline code has actually run.
- `<Stylesheets>`, `<HeadScripts>`, and `<BodyScripts>` now render marker tags around their output and use the WordPress-idiomatic `-js-extra` / `-js-before` / `-js-after` suffixes for inline helper scripts so `AssetUpdater` can target the wc-settings data block reliably.
- New `scopeStyles` utility that wraps WordPress stylesheets in `@scope ([data-rendered])`, extracts pure-variable `:root` blocks to the global scope, and rewrites `body`/`html`/`:root` selectors to `&` so WordPress styles apply only inside the content wrapper without leaking into app chrome.
- `<Content>` now emits `<div data-rendered>` as the scope root (renamed from `data-content`).
- `proxyByWCR` pipes CSS files it proxies through `scopeStyles` so external block/theme stylesheets are scoped consistently with the inline global stylesheet.
