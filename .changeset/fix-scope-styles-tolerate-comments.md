---
"@axistaylor/nextpress": patch
---

Strip CSS block comments at the top of `scopeStylesheet` so downstream passes — `extractCSSVariables`, `isVariablesOnly`, the `:root` → `:scope` rewrite — run on canonical CSS. Fixes two related bugs that surfaced when authors put docblocks inside a `:root { … }` rule:

1. **Variables-only blocks falling through to the scope rewrite.** `isVariablesOnly` splits the block content on `;` and asserts each piece starts with `--`. A `/* docblock */` between declarations produced a piece starting with `/`, so the check returned false and the block ended up as `:scope { … }` inside `@scope ([data-rendered])` instead of being extracted to global `:root { … }`. In practice that meant scoped light-mode tokens silently shadowed `:root.dark` overrides for descendants of the scope element, so toggling dark mode left the WP-rendered content area stuck on light colours.

2. **Selectors hiding inside comments accidentally matching the rewrite regexes.** A construct like `body /* comment */ { … }` left the `body` token visible to the `body` → `&` rewrite from the wrong position. Stripping comments first eliminates the class entirely.

`isVariablesOnly` itself is unchanged; comments are now stripped before any pass sees the CSS. Tests cover both the comment-tolerant extraction path and the case where genuine non-variable declarations alongside comments still scope correctly.
