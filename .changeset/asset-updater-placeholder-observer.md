---
"@axistaylor/nextpress": patch
---

`AssetUpdater` now runs a `MutationObserver` that resolves `__NEXTPRESS_*` placeholders found in element attribute values everywhere in the document — covering both the initial server-rendered tree and any DOM that gets inserted or attribute-mutated after mount. Scoped to attribute values only (text content and characterData mutations are not processed) and short-circuits on a substring guard before touching the regex path, so per-mutation overhead is small. Disconnects cleanly on unmount or when `instance` / `pathname` change.
