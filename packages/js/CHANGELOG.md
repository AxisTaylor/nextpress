# @axistaylor/nextpress

## 1.3.0

### Minor Changes

- [#18](https://github.com/AxisTaylor/nextpress/pull/18) [`f4fe783`](https://github.com/AxisTaylor/nextpress/commit/f4fe783e8c33937eccd51517b3c07edf954e4076) Thanks [@kidunot89](https://github.com/kidunot89)! - Add WP Script Modules support, import maps, deferred script rendering, and comprehensive e2e test coverage.

  **WordPress plugin (`@axistaylor/nextpress-wordpress`)**

  - Add `NextPress_Script_Modules` utility that exposes the private `WP_Script_Modules` registry and import map via `Closure::bind`.
  - `WP_Assets::collect_script_modules_queue()` reads the script modules registry and creates synthetic `_WP_Dependency` entries with `extra['type'] = 'module'` so enqueued modules flow through the `EnqueuedScript` connection alongside classic scripts.
  - Module dependencies (e.g. `@wordpress/interactivity`) are excluded from the scripts list — they're resolved via the browser's import map instead.
  - `WP_Assets::flatten_enqueued_assets_list()` gains a `$check_script_modules` parameter to fall back to the script modules registry for handles not found in the classic registry, with `wp-*` → `@wordpress/*` handle mapping.
  - Add `ScriptTypeEnum` (`CLASSIC` | `MODULE`) and `EnqueuedScript.type` field.
  - Add `ImportMapSchemeEnum` (`FULL` | `RELATIVE`), `WPImport` type, and `UriAssets.importMap` field returning the script module import map entries.
  - Add `transform_cart_url()` to rewrite WooCommerce cart URLs with `__NEXTPRESS_PROXY__` placeholder.
  - Null guard in `all_dependencies_in_footer()` for dependency handles not found in the classic registry.

  **JavaScript package (`@axistaylor/nextpress`)**

  - New `<WPScripts>` unified server component that renders scripts for a given location (head/body), handling classic, deferred (`afterInteractive`), async (`beforeInteractive`), and ES module (`<script type="module">`) scripts.
  - `<HeadScripts>` refactored as a wrapper combining `<GlobalStyles>`, `<ImportMap>`, and `<WPScripts location="head">`.
  - `<BodyScripts>` refactored as a wrapper for `<WPScripts location="body">`.
  - New `<ImportMap>` server component that renders `<script type="importmap">` from `WPImport` entries, routing paths through the NextPress asset proxy via `transformAssetUrl`.
  - Shared URL utilities extracted to `utils/url.ts` (`extractPath`, `isInternalRoute`, `isExternalScript`, `transformAssetUrl`) and `utils/content.ts` (`joinScriptContent`).
  - `AssetUpdater` updated to handle import maps and module scripts on client-side navigation.
  - All inline script content (`extraData`, `before`, `after`) now runs through `replaceProxyPlaceholders` in both head and body scripts.
  - Add `ScriptTypeEnum` and `type` field to `EnqueuedScript` TypeScript types.

  **Backend examples & testing**

  - New `complex-blocks` WordPress plugin with 5 test blocks: `interactive-counter` and `interactive-toggle` (Interactivity API + `viewScriptModule`), `deferred-view` (classic deferred `viewScript`), `session-add-to-cart` (`wp.apiFetch` + inline config), `session-customer-note` (Interactivity API + `wp.apiFetch`).
  - Webpack config supports module output (`output.module` + `experiments.outputModule`) for interactivity blocks, producing correct `@wordpress/interactivity` dependency in `.asset.php`.
  - 3 new e2e test suites: `block-content.spec.ts` (core block rendering), `interactive-blocks.spec.ts` (Interactivity API, script modules, deferred scripts), `session-blocks.spec.ts` (WC session actions via `wp.apiFetch`).
  - Updated `style-isolation.spec.ts` for `data-rendered` rename and marker style exclusion.
  - New unit tests for `utils/url.ts` and `utils/content.ts`.

## 1.2.0

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

## 1.1.0

### Minor Changes

- [#14](https://github.com/AxisTaylor/nextpress/pull/14) [`3db1467`](https://github.com/AxisTaylor/nextpress/commit/3db1467902746fdeef135f0a77acfa8527fcfdd6) Thanks [@kidunot89](https://github.com/kidunot89)! - - Convert HeadScripts, BodyScripts, and Stylesheets to React Server Components using next/script
  - HeadScripts renders with strategy="beforeInteractive", BodyScripts with strategy="afterInteractive"
  - Rename RenderStylesheets to Stylesheets with React precedence attribute for automatic <head> hoisting
  - Add pathname prop to all three components
  - Remove client-side ScriptLoader and sortScriptsByDependencies — dependency ordering handled server-side by WordPress
  - All components now exported from @axistaylor/nextpress (no more /client import path for scripts)
  - Add WooCommerce compatibility: wc-settings URL transformation, proxy placeholder replacement, external script detection in BodyScripts
  - Add bypassExternalLinks option to urlRewritingParser
  - Add linksAs prop to Content for replacing <a> tags with custom components (e.g., Next.js Link)

## 1.0.1

### Patch Changes

- [#12](https://github.com/AxisTaylor/nextpress/pull/12) [`3fe4d99`](https://github.com/AxisTaylor/nextpress/commit/3fe4d9928cdd5a5896fb467b82421fa3486d8b96) Thanks [@kidunot89](https://github.com/kidunot89)! - Scope WordPress CSS to [data-content] to prevent style leakage into the Next.js app layout. Proxied CSS files are wrapped in @scope([data-content]) at the middleware level, and inline styles from RenderStylesheets are scoped at render time. Add woocommerce_ajax_get_endpoint filter to route WC AJAX URLs through the /atx/{slug}/wc proxy. Add style-isolation e2e test suite and update existing tests for /atx/ proxy paths.

## 1.0.0

### Major Changes

- [#3](https://github.com/AxisTaylor/nextpress/pull/3) [`8e9b3cf`](https://github.com/AxisTaylor/nextpress/commit/8e9b3cf26b879ceec34a3c08910a7b3417dd1225) Thanks [@kidunot89](https://github.com/kidunot89)! - Initial v1.0.0 release

  ## Features

  - **Content Component** - Render WordPress Gutenberg HTML content in React with customizable parsers
  - **HeadScripts & BodyScripts** - Load WordPress-enqueued scripts with proper dependency resolution and loading strategies
  - **RenderStylesheets** - Render WordPress stylesheets in correct order with inline styles support
  - **withWCR** - Next.js config wrapper for WordPress backend connection and automatic redirects
  - **proxyByWCR** - Middleware proxy for WordPress REST API, admin-ajax.php, and WooCommerce AJAX
  - **Multi-WordPress Support** - Connect to multiple WordPress backends with instance-based routing

  ## Requirements

  - Next.js 14.2.5+
  - React 18.3.1+
  - WordPress with WPGraphQL plugin
  - NextPress WordPress plugin
