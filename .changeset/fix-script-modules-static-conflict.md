---
"@axistaylor/nextpress": patch
---

Two fixes to the WP plugin's enqueued-asset connection resolvers, both surfaced by upgrading the test environment to WordPress 7.0.

**`NextPress_Script_Modules` static-vs-instance collision (WP 6.7+).** `NextPress_Script_Modules extends \WP_Script_Modules` and was redeclaring `get_registered()` as a `static` method. WP 6.7 added a non-static public `WP_Script_Modules::get_registered()` and PHP refuses to change a method's static-ness in a subclass — the plugin fatals on load with "Cannot make non static method WP_Script_Modules::get_registered() static …", taking the plugin (and the e2e suite) down before anything could boot. Keep the `extends` (the `Closure::bind` reads private members through that scope) and rename our static accessor to `get_registered_modules()`. On WP 6.7+ the new method delegates to the parent's public `get_registered()`; on older WP it falls back to the closure-bound read. Both internal call sites (`WP_Assets::flatten_enqueued_assets_list()`, `WP_Assets::collect_script_modules_queue()`) updated.

**`Uri_Assets` enqueuedScriptsQueue / enqueuedStylesheetsQueue side-effects (WP 7.0).** Both field resolvers were calling `$wp_scripts->reset(); $wp_scripts->queue = [];` (and the styles equivalent) at the end. The connection resolver in WPGraphQL reads the source field twice in `query()`:

```php
return $this->source->enqueuedStylesheetsQueue ? $this->source->enqueuedStylesheetsQueue : [];
```

WPGraphQL's `Model::__get` is supposed to memoize callable fields, but in this WP 7.0 + WPGraphQL combination the second access can re-invoke the closure. On the second invocation the user-enqueued handles are no longer present (the resolver itself just wiped them), `simulate_render()` doesn't re-enqueue them (they were enqueued by test/app code outside any hook), and the second `flatten_enqueued_assets_list` call returns an incomplete set — the missing handle then becomes the value the test/consumer actually sees. Drop the reset/clear from both resolvers. Cleanup of global asset state belongs to WP's request lifecycle, not to a memoizable model field.

Together these fixes restore `AssetDependencyOrderTest::testStylesheetsReturnedInDependencyOrder` (which began failing under WP 7.0 because of the second issue) and resolve the WP 6.7+ boot fatal (which the first issue introduces on every install that has the new parent method).
