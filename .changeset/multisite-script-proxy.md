---
"@axistaylor/nextpress": patch
---

Fix multisite script proxy routing and update documentation.

**JavaScript package (`@axistaylor/nextpress`)**

- `isExternalScript()` now accepts an array of instance home URLs so scripts from any known WordPress instance are proxied instead of loaded directly (fixes CORS errors on multisite where plugin assets come from a different domain than the content site).
- New `isScriptForAnotherInstance()` utility that identifies which instance a script belongs to and routes it through the correct proxy (`/atx/{slug}/...`).
- Updated unit tests for the new `isExternalScript` signature and `isScriptForAnotherInstance`.

**Documentation**

- Updated Getting Started guide with `importMap` in GraphQL queries, `fetchAssetsAction` server action, `AssetUpdater` client wrapper, and the new `HeadScripts` API (`globalStyles` + `importMap` props).
- New `WPScripts` component documentation (core script rendering, script type handling, multisite support).
- New `ImportMap` component documentation (import map rendering, GraphQL query, scheme options).
- Updated `HeadScripts` docs to reflect wrapper pattern (GlobalStyles + ImportMap + WPScripts).
- Updated `BodyScripts` docs to reference WPScripts.
