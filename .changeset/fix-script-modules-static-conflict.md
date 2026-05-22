---
"@axistaylor/nextpress": patch
---

Fix PHP fatal on WP 6.7+ load: `NextPress\Uri_Assets\GraphQL\Utils\NextPress_Script_Modules` extended `\WP_Script_Modules` and redeclared `get_registered()` as `static`. WP 6.7 shipped a non-static public `WP_Script_Modules::get_registered()`, and PHP refuses the signature change ("Cannot make non static method WP_Script_Modules::get_registered() static …"), aborting before the plugin could boot — which in turn took the e2e suite down before any tests could run.

The `extends` was only there to host the `Closure::bind` private-property trick. Drop the inheritance and resolve the live instance through `wp_script_modules()` instead:

- `get_registered()` now prefers `WP_Script_Modules::get_registered()` when the method exists (WP 6.7+) and falls back to a `Closure::bind` rebound to `\WP_Script_Modules`'s class scope for older WP that still keeps the registry private.
- `get_enqueued_import_map()` keeps its closure-bound read of the (still-protected) `get_import_map()` method, but no longer depends on inheritance to bind the scope.

Static method signatures are unchanged, so `WP_Assets::collect_script_modules_queue()` and `Uri_Assets::resolve_import_map_field()` need no updates.
