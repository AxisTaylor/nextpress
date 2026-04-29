---
"@axistaylor/nextpress": patch
---

Fix stylesheet cascade ordering for inline before/after styles

Each stylesheet's before, link, and after elements now share the same
handle-based precedence value instead of using fixed low/medium/high.
This ensures React groups them together per-handle, maintaining correct
cascade order (before → link → after) and preventing inline styles from
being merged across different handles.

Added preinit() calls to hint the browser to load stylesheets early.
Extracted resolveStylesheetHref as a shared utility.
