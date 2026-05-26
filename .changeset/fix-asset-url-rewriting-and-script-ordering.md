---
"@axistaylor/nextpress": patch
"@axistaylor/nextpress-wordpress": patch
---

Fix asset URL rewriting and script dependency ordering for headless WP setups.

**`@axistaylor/nextpress`**

- `Stylesheets` and `AssetUpdater` now preserve external asset URLs (Google Fonts, CDNs) including their query strings, instead of stripping the scheme/host/query and routing them through the WP asset proxy where they 404.
- Protocol-relative URLs (`//host/path`, common in WC enqueues via `set_url_scheme()`) are parsed correctly. Previously `new URL()` threw, the catch returned the input unchanged, and the host ended up as a path segment (`/wp-assets//host/...`).
- WP-instance matching compares hosts instead of full origins so scheme mismatches (http asset on https backend) and protocol-relative URLs still resolve to the configured backend.
- New shared `resolveAssetHref` helper consolidates the foreign-instance / external / current-instance branching across `Stylesheets`, `AssetUpdater` (`updateStylesheets`, `updateScripts`, `updateImportMap`).

**`@axistaylor/nextpress-wordpress`**

- `WP_Assets::flatten_enqueued_assets_list` now appends each resolved dependency just before its dependent in the output list, instead of `array_unshift`-ing all dependencies to the very front of the handles array. The old behavior front-loaded dependencies regardless of which queue items needed them, breaking relative ordering for scripts that rely on implicit load order (e.g. `wc-order-attribution` loading after `wc-stripe-blocks-integration` caused `setOrderTracking is not a function` at runtime).
- New `Assets::skip_unbootstrapped_wc_handles` callback on the `nextpress/graphql/uri-assets/skip_script_module_dependency` filter drops `woocommerce-services-store-notices` from the enqueued asset list when WC Services' `tos_accepted` flag is false. Without TOS, the Store API extension that populates `cart.extensions["woocommerce-services"]` never registers, and the script crashes at runtime trying to read it on US-address checkouts. Gated on the existing `enable_custom_wc_scripts` setting.
