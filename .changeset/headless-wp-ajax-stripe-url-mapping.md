---
"@axistaylor/nextpress": patch
"@axistaylor/nextpress-wordpress": patch
---

Route WP-internal URLs in Stripe localized params through the correct proxy aliases, and stop re-executing external scripts across client-side navigation. Installation-agnostic.

**`@axistaylor/nextpress-wordpress`**

`Assets::transform_stripe_params_urls` now maps each detected WordPress URL to the proxy-route alias it belongs to, before client-side replacement. Previously every WP URL got the same `__NEXTPRESS_ASSETS__/<original-path>` placeholder, producing client URLs like `/atx/<instance>/wp/wp-admin/admin-ajax.php` that match no proxy matcher. New mappings (path is now stripped of any `site_url` subdirectory first, so behavior is identical for root and subdirectory WP installs):

| Detected WP URL | Emitted placeholder |
| --- | --- |
| `…/wp-admin/admin-ajax.php` | `__NEXTPRESS_ASSETS__/wp` (+ query) |
| `?wc-ajax=…` on home_url | `__NEXTPRESS_ASSETS__/wc?wc-ajax=…` |
| `…/wp-(admin\|includes)/…` static | `__NEXTPRESS_ASSETS__/wp-internal-assets/…` |
| `…/wp-content/…` | `__NEXTPRESS_ASSETS__/wp-assets/…` |
| `…/wp-json/…` | `__NEXTPRESS_ASSETS__/wp-json/…` |
| anything else on home_url | `__NEXTPRESS_PROXY__<path>` |

This fixes Stripe UPE Classic's admin-ajax call from `wp_ajax_url` (which previously hit the headless app at `/<page-path>/wp/wp-admin/admin-ajax.php` and 500'd) so SetupIntent creation, payment-intent updates, and other WC Stripe AJAX endpoints reach the WP backend through `proxyByWCR`'s body-forwarding `/wp` and `/wc` short aliases.

**`@axistaylor/nextpress`**

- `replaceProxyPlaceholders` no longer concatenates the current page pathname into the frontend origin when expanding `__NEXTPRESS_PROXY__`. Previously `frontendOrigin = ${wcr_frontend_url}/${pathname}`, so on a page like `/account/add-payment-method` every `__NEXTPRESS_PROXY__` got replaced with `${origin}//account/add-payment-method` (note the double slash + injected path segment), corrupting every WP-emitted absolute URL routed through that placeholder. The `pathname` argument is kept in the signature for back-compat with existing callers but is now unused.

- `AssetUpdater` now dedupes external `<script src>` insertions across the session via a module-level `Set` of already-loaded src URLs, seeded from any scripts already in the DOM between the markers on first run. Removing a `<script>` from the DOM does not undo its side-effects (globals it defined, custom elements it registered), so re-inserting the same external src on a subsequent client-side navigation would re-run its IIFE and break anything non-idempotent. The trigger in practice was `wc-order-attribution`'s `customElements.define('wc-order-attribution-inputs', …)` throwing `NotSupportedError: the name … has already been used with this registry` on the second navigation. Inline `extraData` / `before` / `after` blocks still run on every navigation since they typically carry page-specific data.
