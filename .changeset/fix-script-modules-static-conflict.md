---
"@axistaylor/nextpress": patch
---

Fix PHP fatal on WP 6.7+ load: `NextPress\Uri_Assets\GraphQL\Utils\NextPress_Script_Modules` extends `\WP_Script_Modules` and was redeclaring `get_registered()` as a `static` method. WP 6.7 shipped a non-static public `WP_Script_Modules::get_registered()`, and PHP refuses to change a method's static-ness in a subclass ("Cannot make non static method WP_Script_Modules::get_registered() static …"), aborting the plugin before it could boot.

The class is purely a workaround for the upstream registry being private — keep the `extends` (the closure-bind reads private members through that scope), and just rename our static accessor to sidestep the collision.

- `get_registered()` → `get_registered_modules()`. When the parent exposes a public `get_registered()` (WP 6.7+), the new method calls straight through to it; on older WP it keeps the closure-bound read of the private `$registered`.
- `get_enqueued_import_map()` is unchanged.
- Internal call sites in `WP_Assets::flatten_enqueued_assets_list()` and `WP_Assets::collect_script_modules_queue()` updated to the new name.
