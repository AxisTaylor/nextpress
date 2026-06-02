---
"@axistaylor/nextpress": minor
---

Defer the theme.json `@font-face` block off the critical path, with a matching opt-in knob for the theme.json `stylesheet` content.

- `GlobalStyles` accepts two new props:
  - `deferFonts?: boolean` — default `true`. Renders the `@font-face` `<style>` with `media="print" data-np-defer="1"` and emits an inline swap-script that promotes it to `media="all"` once parsed. Text above the fold paints with system fallbacks (per `font-display: swap`) and repaints with the web font as soon as it's downloaded — same final result, but Lighthouse no longer counts font-face declarations against "Eliminate render-blocking resources". Set to `false` when above-the-fold text uses glyphs that don't exist in any fallback (icon fonts, custom symbol fonts).
  - `deferGlobalStyles?: boolean` — default `false`. Same defer pattern for the theme.json `stylesheet` block (CSS custom property bindings + base block-supports rules). Off by default because these usually carry layout-critical tokens; opt in only when you can absorb a token-flash on first paint.
- `WPHead` forwards both new props.
- The `Stylesheets` swap-script selector now matches both `link[data-np-defer]` and `style[data-np-defer]`, so the same inline script handles deferred `<link>` sheets and deferred inline `<style>` blocks. `GlobalStyles` also ships its own copy of the script for setups where `Stylesheets` is unused or has no deferred handles, so the deferral works in both arrangements.
- Documented `criticalHandles` (shipped in v1.3.0 but previously undocumented) in `docs/api/stylesheets.md` with the trade-off profile, plus reference-linked it from `docs/api/wp-head.md`.
