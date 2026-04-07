# @axistaylor/nextpress-wordpress

## 1.1.0

### Minor Changes

- [#16](https://github.com/AxisTaylor/nextpress/pull/16) [`d0763f7`](https://github.com/AxisTaylor/nextpress/commit/d0763f72e788bb07031af706001ce71304ce9e89) Thanks [@kidunot89](https://github.com/kidunot89)! - Add `globalStyles` query, client-side asset refresh, and scoped WordPress CSS.

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

## 1.0.3

### Patch Changes

- [#12](https://github.com/AxisTaylor/nextpress/pull/12) [`3fe4d99`](https://github.com/AxisTaylor/nextpress/commit/3fe4d9928cdd5a5896fb467b82421fa3486d8b96) Thanks [@kidunot89](https://github.com/kidunot89)! - Scope WordPress CSS to [data-content] to prevent style leakage into the Next.js app layout. Proxied CSS files are wrapped in @scope([data-content]) at the middleware level, and inline styles from RenderStylesheets are scoped at render time. Add woocommerce_ajax_get_endpoint filter to route WC AJAX URLs through the /atx/{slug}/wc proxy. Add style-isolation e2e test suite and update existing tests for /atx/ proxy paths.

## 1.0.2

### Patch Changes

- [#10](https://github.com/AxisTaylor/nextpress/pull/10) [`31da5e8`](https://github.com/AxisTaylor/nextpress/commit/31da5e81adf8b76c512471e959173bbec6326417) Thanks [@kidunot89](https://github.com/kidunot89)! - Problem: WooCommerce block scripts weren't being included in assetsByUri query results.

  Root Cause: WPGraphQL WooCommerce adds a filter making WC()->is_rest_api_request() return true for GraphQL requests.
  WooCommerce blocks check this in their render_callback() and skip enqueuing scripts when it returns true.

  Solution:

  - Added nextpress_pre_simulate_render and nextpress_post_simulate_render hooks in the Model class around the content rendering simulation
  - In Assets class, hooked into these to temporarily override the filter (making it return false) during simulation, then restore it afterward
  - Only activates when enable_custom_wc_scripts setting is enable

## 1.0.1

### Patch Changes

- [#8](https://github.com/AxisTaylor/nextpress/pull/8) [`b20b3e1`](https://github.com/AxisTaylor/nextpress/commit/b20b3e168adba9678e3d423caf8bcf50ff49d9d3) Thanks [@kidunot89](https://github.com/kidunot89)! - Documentation updated
