---
"@axistaylor/nextpress": patch
---

AssetUpdater now re-executes WordPress view scripts on client-side navigation, so scripts using the standard `document.readyState` / `DOMContentLoaded` ready-check re-initialize for the new page's content without any SPA-specific code. Adds a `reinitBypassHandles` prop to opt non-idempotent scripts (e.g. `wc-order-attribution`, whose `customElements.define()` throws on a second run) out of re-running — those load once and are skipped on subsequent navigations.
