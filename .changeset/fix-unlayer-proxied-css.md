---
"@axistaylor/nextpress": patch
---

Stop wrapping proxied `.css` files (`wp-block-library`, plugin/theme CSS) in `@layer wp-base`. Cascade Layers L5 puts layer ordering above specificity, so the previous setup pinned the active theme's compiled stylesheet below theme.json's generic rules — a theme's `.wp-block-button.is-style-cta .wp-block-button__link` (specificity 0,3,0) would lose to theme.json's `.wp-element-button` (0,1,0) regardless of how specific its selector was, breaking button variants, padding, border-radius, and any rule that competed with theme.json defaults.

Now only `globalStyles.stylesheet` + `customCss` live in `@layer wp-theme`; proxied `.css` files stay unlayered and beat theme.json by normal specificity + source order (the same cascade behaviour users see on the WordPress backend). Per-instance core-block-supports inline content also stays unlayered, so the original block-gap override behaviour from the previous release is preserved.

The layer-order declaration emitted by `GlobalStyles` and `AssetUpdater.updateGlobalStyles` is now `@layer wp-theme;` (was `@layer wp-base, wp-theme;`).
