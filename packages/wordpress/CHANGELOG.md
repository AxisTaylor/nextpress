# @axistaylor/nextpress-wordpress

## 1.3.4

### Patch Changes

- [#55](https://github.com/AxisTaylor/nextpress/pull/55) [`a5aba79`](https://github.com/AxisTaylor/nextpress/commit/a5aba7913ec1f648a2d69eefbf9a2fa18fb9c07b) Thanks [@kidunot89](https://github.com/kidunot89)! - Route WP-internal URLs in Stripe localized params through the correct proxy aliases, and stop re-executing external scripts across client-side navigation. Installation-agnostic.

  **`@axistaylor/nextpress-wordpress`**

  `Assets::transform_stripe_params_urls` now maps each detected WordPress URL to the proxy-route alias it belongs to, before client-side replacement. Previously every WP URL got the same `__NEXTPRESS_ASSETS__/<original-path>` placeholder, producing client URLs like `/atx/<instance>/wp/wp-admin/admin-ajax.php` that match no proxy matcher. New mappings (path is now stripped of any `site_url` subdirectory first, so behavior is identical for root and subdirectory WP installs):

  | Detected WP URL                   | Emitted placeholder                         |
  | --------------------------------- | ------------------------------------------- |
  | `…/wp-admin/admin-ajax.php`       | `__NEXTPRESS_ASSETS__/wp` (+ query)         |
  | `?wc-ajax=…` on home_url          | `__NEXTPRESS_ASSETS__/wc?wc-ajax=…`         |
  | `…/wp-(admin\|includes)/…` static | `__NEXTPRESS_ASSETS__/wp-internal-assets/…` |
  | `…/wp-content/…`                  | `__NEXTPRESS_ASSETS__/wp-assets/…`          |
  | `…/wp-json/…`                     | `__NEXTPRESS_ASSETS__/wp-json/…`            |
  | anything else on home_url         | `__NEXTPRESS_PROXY__<path>`                 |

  This fixes Stripe UPE Classic's admin-ajax call from `wp_ajax_url` (which previously hit the headless app at `/<page-path>/wp/wp-admin/admin-ajax.php` and 500'd) so SetupIntent creation, payment-intent updates, and other WC Stripe AJAX endpoints reach the WP backend through `proxyByWCR`'s body-forwarding `/wp` and `/wc` short aliases.

  **`@axistaylor/nextpress`**

  - `replaceProxyPlaceholders` no longer concatenates the current page pathname into the frontend origin when expanding `__NEXTPRESS_PROXY__`. Previously `frontendOrigin = ${wcr_frontend_url}/${pathname}`, so on a page like `/account/add-payment-method` every `__NEXTPRESS_PROXY__` got replaced with `${origin}//account/add-payment-method` (note the double slash + injected path segment), corrupting every WP-emitted absolute URL routed through that placeholder. The `pathname` argument is kept in the signature for back-compat with existing callers but is now unused.

  - `AssetUpdater` now dedupes external `<script src>` insertions across the session via a module-level `Set` of already-loaded src URLs, seeded from any scripts already in the DOM between the markers on first run. Removing a `<script>` from the DOM does not undo its side-effects (globals it defined, custom elements it registered), so re-inserting the same external src on a subsequent client-side navigation would re-run its IIFE and break anything non-idempotent. The trigger in practice was `wc-order-attribution`'s `customElements.define('wc-order-attribution-inputs', …)` throwing `NotSupportedError: the name … has already been used with this registry` on the second navigation. Inline `extraData` / `before` / `after` blocks still run on every navigation since they typically carry page-specific data.

## 1.3.3

### Patch Changes

- [#53](https://github.com/AxisTaylor/nextpress/pull/53) [`e685fe8`](https://github.com/AxisTaylor/nextpress/commit/e685fe85c423bc81c68e4e12722495a8f8d7678c) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix asset URL rewriting and script dependency ordering for headless WP setups.

  **`@axistaylor/nextpress`**

  - `Stylesheets` and `AssetUpdater` now preserve external asset URLs (Google Fonts, CDNs) including their query strings, instead of stripping the scheme/host/query and routing them through the WP asset proxy where they 404.
  - Protocol-relative URLs (`//host/path`, common in WC enqueues via `set_url_scheme()`) are parsed correctly. Previously `new URL()` threw, the catch returned the input unchanged, and the host ended up as a path segment (`/wp-assets//host/...`).
  - WP-instance matching compares hosts instead of full origins so scheme mismatches (http asset on https backend) and protocol-relative URLs still resolve to the configured backend.
  - New shared `resolveAssetHref` helper consolidates the foreign-instance / external / current-instance branching across `Stylesheets`, `AssetUpdater` (`updateStylesheets`, `updateScripts`, `updateImportMap`).

  **`@axistaylor/nextpress-wordpress`**

  - `WP_Assets::flatten_enqueued_assets_list` now appends each resolved dependency just before its dependent in the output list, instead of `array_unshift`-ing all dependencies to the very front of the handles array. The old behavior front-loaded dependencies regardless of which queue items needed them, breaking relative ordering for scripts that rely on implicit load order (e.g. `wc-order-attribution` loading after `wc-stripe-blocks-integration` caused `setOrderTracking is not a function` at runtime).
  - New `Assets::skip_unbootstrapped_wc_handles` callback on the `nextpress/graphql/uri-assets/skip_script_module_dependency` filter drops `woocommerce-services-store-notices` from the enqueued asset list when WC Services' `tos_accepted` flag is false. Without TOS, the Store API extension that populates `cart.extensions["woocommerce-services"]` never registers, and the script crashes at runtime trying to read it on US-address checkouts. Gated on the existing `enable_custom_wc_scripts` setting.

## 1.3.2

### Patch Changes

- [#47](https://github.com/AxisTaylor/nextpress/pull/47) [`d7798ab`](https://github.com/AxisTaylor/nextpress/commit/d7798ab5a4bf462b2d42b09b9423843b76594595) Thanks [@kidunot89](https://github.com/kidunot89)! - `NextPress_Script_Modules extends \WP_Script_Modules` was redeclaring `get_registered()` as a `static` method. WP 6.7 shipped a non-static public `WP_Script_Modules::get_registered()`, and PHP refuses to change a method's static-ness in a subclass — the plugin fatals on load with "Cannot make non static method WP_Script_Modules::get_registered() static …", taking the plugin (and the e2e suite) down before anything could boot.

  Rename our accessor to `get_registered_modules()` to sidestep the collision. It reads the private `$registered` property via a `Closure::bind` rebound to `\WP_Script_Modules`'s class scope — works on every WP version that ships the class. We can't delegate to the parent's public method even when it exists, because WP 7.0's `WP_Script_Modules::get_registered( string $id )` returns a _single_ module by ID, not the full registry. Both internal call sites — `WP_Assets::flatten_enqueued_assets_list()` and `WP_Assets::collect_script_modules_queue()` — updated to the new name.

  Also fixes `AssetDependencyOrderTest::testStylesheetsReturnedInDependencyOrder`, which began failing after the test environment moved to WP 7.0. WP 7.0 enqueues more default frontend stylesheets (`wp-block-styles-placeholder`, `wp-global-styles-placeholder`, `wp-block-paragraph`, etc.) than 6.9, pushing the test's expected handle past the default `first: 10` GraphQL connection pagination. The query now requests `first: 100` so the full enqueued set is returned.

## 1.3.1

### Patch Changes

- [#43](https://github.com/AxisTaylor/nextpress/pull/43) [`0e6ad56`](https://github.com/AxisTaylor/nextpress/commit/0e6ad56bf2745fa031bb9dbe091b5b4b1b07dbf3) Thanks [@kidunot89](https://github.com/kidunot89)! - Remove the static `"version"` field from `packages/wordpress/composer.json`. Packagist derives the package version from the dist repo's git tag (`v<X.Y.Z>` mirrored from the source `wp-v<X.Y.Z>` tag), so a hard-coded `composer.json` version competes with — and on some Composer setups overrides — the tag-derived version. Letting the tag be the single source of truth fixes that.

## 1.3.0

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

## 1.2.1

### Patch Changes

- [#26](https://github.com/AxisTaylor/nextpress/pull/26) [`c05766c`](https://github.com/AxisTaylor/nextpress/commit/c05766c94126da08eb5bf867a4c1992e5c5f28c3) Thanks [@kidunot89](https://github.com/kidunot89)! - Fix CSS variable scoping and layout class support for WordPress content rendering.

  - **`extractCSSVariables`**: Handles `:root`/`:host` blocks inside `@layer` wrappers (e.g. Tailwind v4's `@layer theme { :root, :host { ... } }`). Extracted blocks preserve their `@layer` wrapper for correct ordering.
  - **`:root` → `:scope` rewrite**: Preserves 0,1,0 specificity inside `@scope` so layout spacing rules override block-level margin shorthands, matching WordPress's cascade behavior.
  - **`contentCssClasses` GraphQL field**: New field on `ContentNode` returning layout CSS classes from the template's `core/post-content` block (`is-layout-constrained`, `has-global-padding`, etc.).
  - **`Content` component**: Accepts `contentCssClasses` prop, renders an inner wrapper with layout classes. Uses `clsx` for class joining.
  - **Custom block theme**: Added to backend-4-examples with Tailwind `@theme` variables, theme.json presets, light/dark mode, and Typography Showcase test page.
  - **Complex block buttons**: Updated render.php files to use `wp-element-button` class for proper theme styling.

## 1.2.0

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
