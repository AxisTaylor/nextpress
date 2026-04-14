---
"@axistaylor/nextpress": minor
"@axistaylor/nextpress-wordpress": minor
---

Add WP Script Modules support, import maps, deferred script rendering, and comprehensive e2e test coverage.

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
