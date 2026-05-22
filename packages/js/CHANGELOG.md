# @axistaylor/nextpress

## 1.5.2

### Patch Changes

- [#47](https://github.com/AxisTaylor/nextpress/pull/47) [`c271db0`](https://github.com/AxisTaylor/nextpress/commit/c271db05e8b907ee46418024bd6e88be3496d994) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix dark-mode (and other root-variant) CSS variable token swaps being silently dropped by `scopeStylesheet`. The variable-extraction regex only matched plain `:root { … }` and `:root, :host { … }` blocks, so chained variants like `:root.dark { --tokens }` fell through to the main scope rewrite and were emitted as `:scope.dark { … }` inside `@scope ([data-rendered])` — where they could never match because the `.dark` class lives on `<html>`, not on the scope element. As a result the light-mode `:root { … }` extracted cleanly and applied globally, but the dark-mode override was effectively dead, leaving WP-rendered content stuck on the light palette even after the app toggled to dark.

  `extractCSSVariables` now matches `:root` / `:host` chained with attached modifiers (`.dark`, `[data-theme="x"]`, `#id`, `:where(.dark)`, etc.) — anything that still targets the document root without a descendant combinator — and preserves the original selector when emitting the extracted block globally. So `:root.dark { --bg: black }` stays as `:root.dark { --bg: black }` outside the `@scope` wrapper and fires correctly the moment the `.dark` class lands on `<html>`. Plain `:root .foo { … }` (a descendant selector, not a root variable block) is unaffected and still scopes.

  Comma-separated lists like `:root, :host { … }` also now retain their original selector on extraction (was previously collapsing to just `:root`).

## 1.5.1

### Patch Changes

- [#45](https://github.com/AxisTaylor/nextpress/pull/45) [`d75cf48`](https://github.com/AxisTaylor/nextpress/commit/d75cf480029f5ec5cf8a52588e2d581be7344d4f) Thanks [@kidunot89](https://github.com/kidunot89)! - Stop wrapping proxied `.css` files (`wp-block-library`, plugin/theme CSS) in `@layer wp-base`. Cascade Layers L5 puts layer ordering above specificity, so the previous setup pinned the active theme's compiled stylesheet below theme.json's generic rules — a theme's `.wp-block-button.is-style-cta .wp-block-button__link` (specificity 0,3,0) would lose to theme.json's `.wp-element-button` (0,1,0) regardless of how specific its selector was, breaking button variants, padding, border-radius, and any rule that competed with theme.json defaults.

  Now only `globalStyles.stylesheet` + `customCss` live in `@layer wp-theme`; proxied `.css` files stay unlayered and beat theme.json by normal specificity + source order (the same cascade behaviour users see on the WordPress backend). Per-instance core-block-supports inline content also stays unlayered, so the original block-gap override behaviour from the previous release is preserved.

  The layer-order declaration emitted by `GlobalStyles` and `AssetUpdater.updateGlobalStyles` is now `@layer wp-theme;` (was `@layer wp-base, wp-theme;`).

## 1.5.0

### Minor Changes

- [#32](https://github.com/AxisTaylor/nextpress/pull/32) [`957be85`](https://github.com/AxisTaylor/nextpress/commit/957be8512bbe244f49b57495e6ccc8581157c208) Thanks [@kidunot89](https://github.com/kidunot89)! - Layer WP-derived CSS so per-instance block-supports rules reliably override theme.json defaults.

  Previously a `style.spacing.blockGap` set on a specific block (or any per-instance core-block-supports rule) could lose in the cascade to a same-specificity `:scope :where(…)` rule emitted by `wp_get_global_stylesheet()`, because both were unlayered and source order was non-deterministic when theme.json content showed up via duplicate emissions.

  Now:

  - `scopeStylesheet()` / `scopeInlineStyles()` accept an optional `{ layer }` that wraps the scoped output in `@layer <name>`.
  - `GlobalStyles` emits `@layer wp-base, wp-theme;` once near the top of the head and wraps theme.json `stylesheet` + `customCss` in `@layer wp-theme { @scope ([data-rendered]) { … } }`.
  - `proxyByWCR` wraps every proxied `.css` response in `@layer wp-base { @scope ([data-rendered]) { … } }`.
  - `Stylesheets` inline `before` / `after` payloads stay unlayered (per-instance block-supports CSS, dynamic plugin inline styles).
  - The WP plugin's `WP_Assets::flatten_enqueued_assets_list` filters out the core `global-styles` handle so its inline-after content (which duplicates `wp_get_global_stylesheet()`) doesn't reach the browser as an unlayered shadow of the theme.json payload exposed via the `globalStyles` GraphQL field.

  The resulting cascade is `wp-base < wp-theme < unlayered < inline style="…"`, so per-instance overrides and app CSS reliably beat theme.json defaults without nextpress needing to branch on specific WP handle names.

## 1.4.3

### Patch Changes

- [#30](https://github.com/AxisTaylor/nextpress/pull/30) [`ac34374`](https://github.com/AxisTaylor/nextpress/commit/ac34374bd51138556d61670e931a533f996016d8) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix stylesheet cascade ordering for inline before/after styles

  Each stylesheet's before, link, and after elements now share the same
  handle-based precedence value instead of using fixed low/medium/high.
  This ensures React groups them together per-handle, maintaining correct
  cascade order (before → link → after) and preventing inline styles from
  being merged across different handles.

  Added preinit() calls to hint the browser to load stylesheets early.
  Extracted resolveStylesheetHref as a shared utility.

## 1.4.2

### Patch Changes

- [#28](https://github.com/AxisTaylor/nextpress/pull/28) [`06e4ea4`](https://github.com/AxisTaylor/nextpress/commit/06e4ea4df75b86df2696e84f0f85e7fb530d7a49) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix inline styles (before/after) being deduplicated by React

  The Stylesheets component used the same `href` value for both the `<link>` stylesheet and its inline `<style>` before/after tags. React deduplicates `<style>` elements with identical `href` values, causing inline styles registered via `wp_add_inline_style()` to silently disappear from the rendered HTML.

  Changed the `href` on inline `<Style>` tags to use `{handle}-before-inline` and `{handle}-after-inline` instead of reusing the parent stylesheet's URL, ensuring each element has a unique identity for React's deduplication logic.

## 1.4.1

### Patch Changes

- [#26](https://github.com/AxisTaylor/nextpress/pull/26) [`c05766c`](https://github.com/AxisTaylor/nextpress/commit/c05766c94126da08eb5bf867a4c1992e5c5f28c3) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix CSS variable scoping and layout class support for WordPress content rendering.

  - **`extractCSSVariables`**: Handles `:root`/`:host` blocks inside `@layer` wrappers (e.g. Tailwind v4's `@layer theme { :root, :host { ... } }`). Extracted blocks preserve their `@layer` wrapper for correct ordering.
  - **`:root` → `:scope` rewrite**: Preserves 0,1,0 specificity inside `@scope` so layout spacing rules override block-level margin shorthands, matching WordPress's cascade behavior.
  - **`contentCssClasses` GraphQL field**: New field on `ContentNode` returning layout CSS classes from the template's `core/post-content` block (`is-layout-constrained`, `has-global-padding`, etc.).
  - **`Content` component**: Accepts `contentCssClasses` prop, renders an inner wrapper with layout classes. Uses `clsx` for class joining.
  - **Custom block theme**: Added to backend-4-examples with Tailwind `@theme` variables, theme.json presets, light/dark mode, and Typography Showcase test page.
  - **Complex block buttons**: Updated render.php files to use `wp-element-button` class for proper theme styling.

## 1.4.0

### Minor Changes

- [#24](https://github.com/AxisTaylor/nextpress/pull/24) [`ca40b98`](https://github.com/AxisTaylor/nextpress/commit/ca40b986c48f9326699d5a87981a7fab58066c53) Thanks [@kidunot89](https://github.com/kidunot89)! - Rename HeadScripts/BodyScripts to WPHead/WPFooter, add Content parsers array, and migrate nextImageParser into the library.

  - **WPHead** (formerly HeadScripts): now renders GlobalStyles, Stylesheets, ImportMap, and head scripts in one component. Deprecated `HeadScripts` alias still exported.
  - **WPFooter** (formerly BodyScripts): renders footer scripts. Deprecated `BodyScripts` alias still exported.
  - **Content `parsers` prop**: accepts `CustomParser[]` array. Deprecated single `parser` prop still works.
  - **`nextImageParser`**: built-in parser that converts WP `<img>` to Next.js `<Image>`. Exported from `@axistaylor/nextpress/client`.
  - **`createUrlRewritingParser`** and **`UrlRewritingParserOptions`** now exported from the main entry.
  - **`instancesReadableOnClient`**: new `withWCR` option to expose WP instance config to client components.
  - Added `next/image` and `next/navigation` to rollup externals.

## 1.3.2

### Patch Changes

- [#22](https://github.com/AxisTaylor/nextpress/pull/22) [`b442ee2`](https://github.com/AxisTaylor/nextpress/commit/b442ee220c8c8228d11194c6c166faa6449da23c) Thanks [@kidunot89](https://github.com/kidunot89)! - Fire synthetic DOMContentLoaded/load events on initial mount so WordPress scripts initialize on first page load.

  - New `usePageEvents` hook and `firePageEvents` utility that dispatch synthetic `DOMContentLoaded`, `load`, and `nextpress:page-change` events
  - New `<PageEvents>` client component for apps not using AssetUpdater
  - `AssetUpdater` fires page events on initial mount (before skipping asset refresh) so WP scripts that listen for `DOMContentLoaded` can initialize — previously they only fired on client-side navigation
  - Export `PageEvents`, `usePageEvents`, and `firePageEvents` from `@axistaylor/nextpress/client`

## 1.3.1

### Patch Changes

- [#20](https://github.com/AxisTaylor/nextpress/pull/20) [`895f357`](https://github.com/AxisTaylor/nextpress/commit/895f3578c9f03c42f1633d182d23640a4c4968bf) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix multisite script proxy routing and update documentation.

  **JavaScript package (`@axistaylor/nextpress`)**

  - `isExternalScript()` now accepts an array of instance home URLs so scripts from any known WordPress instance are proxied instead of loaded directly (fixes CORS errors on multisite where plugin assets come from a different domain than the content site).
  - New `isScriptForAnotherInstance()` utility that identifies which instance a script belongs to and routes it through the correct proxy (`/atx/{slug}/...`).
  - Updated unit tests for the new `isExternalScript` signature and `isScriptForAnotherInstance`.

  **Documentation**

  - Updated Getting Started guide with `importMap` in GraphQL queries, `fetchAssetsAction` server action, `AssetUpdater` client wrapper, and the new `HeadScripts` API (`globalStyles` + `importMap` props).
  - New `WPScripts` component documentation (core script rendering, script type handling, multisite support).
  - New `ImportMap` component documentation (import map rendering, GraphQL query, scheme options).
  - Updated `HeadScripts` docs to reflect wrapper pattern (GlobalStyles + ImportMap + WPScripts).
  - Updated `BodyScripts` docs to reference WPScripts.

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
