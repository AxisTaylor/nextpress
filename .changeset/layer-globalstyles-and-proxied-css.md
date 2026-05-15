---
"@axistaylor/nextpress": minor
"@axistaylor/nextpress-wordpress": minor
---

Layer WP-derived CSS so per-instance block-supports rules reliably override theme.json defaults.

Previously a `style.spacing.blockGap` set on a specific block (or any per-instance core-block-supports rule) could lose in the cascade to a same-specificity `:scope :where(…)` rule emitted by `wp_get_global_stylesheet()`, because both were unlayered and source order was non-deterministic when theme.json content showed up via duplicate emissions.

Now:

- `scopeStylesheet()` / `scopeInlineStyles()` accept an optional `{ layer }` that wraps the scoped output in `@layer <name>`.
- `GlobalStyles` emits `@layer wp-base, wp-theme;` once near the top of the head and wraps theme.json `stylesheet` + `customCss` in `@layer wp-theme { @scope ([data-rendered]) { … } }`.
- `proxyByWCR` wraps every proxied `.css` response in `@layer wp-base { @scope ([data-rendered]) { … } }`.
- `Stylesheets` inline `before` / `after` payloads stay unlayered (per-instance block-supports CSS, dynamic plugin inline styles).
- The WP plugin's `WP_Assets::flatten_enqueued_assets_list` filters out the core `global-styles` handle so its inline-after content (which duplicates `wp_get_global_stylesheet()`) doesn't reach the browser as an unlayered shadow of the theme.json payload exposed via the `globalStyles` GraphQL field.

The resulting cascade is `wp-base < wp-theme < unlayered < inline style="…"`, so per-instance overrides and app CSS reliably beat theme.json defaults without nextpress needing to branch on specific WP handle names.
