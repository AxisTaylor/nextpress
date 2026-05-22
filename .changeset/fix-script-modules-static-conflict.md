---
"@axistaylor/nextpress": patch
---

Two fixes to the WP plugin's enqueued-asset connection resolvers, both surfaced by upgrading the test environment to WordPress 7.0.

**`NextPress_Script_Modules` static-vs-instance collision (WP 6.7+).** `NextPress_Script_Modules extends \WP_Script_Modules` was redeclaring `get_registered()` as a `static` method. WP 6.7 added a non-static public `WP_Script_Modules::get_registered()`, and PHP refuses to change a method's static-ness in a subclass — the plugin fatals on load with "Cannot make non static method WP_Script_Modules::get_registered() static …", taking the plugin (and the e2e suite) down before anything could boot. Keep the `extends` (the `Closure::bind` reads private members through that scope) and rename our static accessor to `get_registered_modules()`. On WP 6.7+ the new method delegates to the parent's public `get_registered()`; on older WP it falls back to the closure-bound read. Both internal call sites (`WP_Assets::flatten_enqueued_assets_list()`, `WP_Assets::collect_script_modules_queue()`) updated.

**Drop the stale `$wp_styles->reset(); $wp_styles->queue = [];` (and the scripts equivalent) from the `Uri_Assets` resolvers.** Model field resolvers are expected to be pure / memoizable; wiping global asset state from inside one is a side-effect that the rest of the request can't see and shouldn't depend on. The line was harmless before but interacts badly with the connection resolver's double-read (`$source->enqueuedStylesheetsQueue ? $source->enqueuedStylesheetsQueue : []`) if Model memoization ever has to fall through. Removing it makes the resolver re-runnable without surprises.

Note: the test that began failing on WP 7.0 (`AssetDependencyOrderTest::testStylesheetsReturnedInDependencyOrder`) was actually being defeated by GraphQL connection pagination — WP 7.0 enqueues more default frontend stylesheets (`wp-block-styles-placeholder`, `wp-global-styles-placeholder`, `wp-block-paragraph`, etc.) than 6.9, pushing the test's expected handle past the default `first: 10`. The test now requests `first: 100` explicitly so it sees the full enqueued set.
