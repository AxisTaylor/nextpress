---
"@axistaylor/nextpress": patch
---

Fix inline styles (before/after) being deduplicated by React

The Stylesheets component used the same `href` value for both the `<link>` stylesheet and its inline `<style>` before/after tags. React deduplicates `<style>` elements with identical `href` values, causing inline styles registered via `wp_add_inline_style()` to silently disappear from the rendered HTML.

Changed the `href` on inline `<Style>` tags to use `{handle}-before-inline` and `{handle}-after-inline` instead of reusing the parent stylesheet's URL, ensuring each element has a unique identity for React's deduplication logic.
