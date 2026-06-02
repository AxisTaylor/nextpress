---
"@axistaylor/nextpress": patch
---

Add `skipFonts` boolean to `GlobalStyles` (forwarded by `WPHead`). When set, suppresses the `<style id="nextpress-font-faces">` block and its swap-script entirely — useful when the host application loads its own webfonts (e.g. via `next/font/google`) and doesn't want the WordPress-proxied `@font-face` declarations re-injected. Takes precedence over `deferFonts`.
