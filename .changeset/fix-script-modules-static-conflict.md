---
"@axistaylor/nextpress": patch
---

`NextPress_Script_Modules extends \WP_Script_Modules` was redeclaring `get_registered()` as a `static` method. WP 6.7 shipped a non-static public `WP_Script_Modules::get_registered()`, and PHP refuses to change a method's static-ness in a subclass — the plugin fatals on load with "Cannot make non static method WP_Script_Modules::get_registered() static …", taking the plugin (and the e2e suite) down before anything could boot.

Rename our accessor to `get_registered_modules()` to sidestep the collision. It reads the private `$registered` property via a `Closure::bind` rebound to `\WP_Script_Modules`'s class scope — works on every WP version that ships the class. We can't delegate to the parent's public method even when it exists, because WP 7.0's `WP_Script_Modules::get_registered( string $id )` returns a *single* module by ID, not the full registry. Both internal call sites — `WP_Assets::flatten_enqueued_assets_list()` and `WP_Assets::collect_script_modules_queue()` — updated to the new name.

Also fixes `AssetDependencyOrderTest::testStylesheetsReturnedInDependencyOrder`, which began failing after the test environment moved to WP 7.0. WP 7.0 enqueues more default frontend stylesheets (`wp-block-styles-placeholder`, `wp-global-styles-placeholder`, `wp-block-paragraph`, etc.) than 6.9, pushing the test's expected handle past the default `first: 10` GraphQL connection pagination. The query now requests `first: 100` so the full enqueued set is returned.
