---
"@axistaylor/nextpress": minor
"@axistaylor/nextpress-wordpress": minor
---

Add WP Script Modules support and fix deferred script rendering.

**WordPress plugin (`@axistaylor/nextpress-wordpress`)**

- Add `NextPress_Script_Modules` utility class that exposes the private `WP_Script_Modules::$registered` array via `Closure::bind`, allowing the asset resolver to read enqueued script modules without reflection.
- `WP_Assets::collect_script_modules_queue()` reads the script modules registry and queue, creates synthetic `_WP_Dependency` entries in `$wp_scripts->registered` with `extra['type'] = 'module'`, and pushes queued module IDs onto `$wp_scripts->queue` so they flow through the existing `EnqueuedScript` connection alongside classic scripts.
- `WP_Assets::flatten_enqueued_assets_list()` gains a `$check_script_modules` parameter to fall back to the script modules registry for handles not found in the classic registry, with `wp-*` → `@wordpress/*` handle mapping.
- Add `ScriptTypeEnum` (`CLASSIC` | `MODULE`) and `EnqueuedScript.type` field so the frontend can distinguish ES modules from classic scripts.
- Null guard in `all_dependencies_in_footer()` for dependency handles not found in the classic registry.

**JavaScript package (`@axistaylor/nextpress`)**

- Add `ScriptTypeEnum` to the TypeScript types and `type` field on `EnqueuedScript`.
- `HeadScripts`: scripts with `strategy: DEFER` now render as plain `<script defer src="...">` tags instead of using `next/script` with `beforeInteractive`, so they execute after DOM parsing — matching WordPress's native behavior and fixing block view scripts that need to find their elements in the DOM.
- `HeadScripts`: scripts with `type: MODULE` render as `<script type="module" src="...">`.
- `BodyScripts`: scripts with `type: MODULE` render as `<script type="module" src="...">`.
- `AssetUpdater`: module scripts are inserted with `type="module"` and skip inline extra/before/after processing.
