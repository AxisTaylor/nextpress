---
"@axistaylor/nextpress": patch
---

Fix dark-mode (and other root-variant) CSS variable token swaps being silently dropped by `scopeStylesheet`. The variable-extraction regex only matched plain `:root { … }` and `:root, :host { … }` blocks, so chained variants like `:root.dark { --tokens }` fell through to the main scope rewrite and were emitted as `:scope.dark { … }` inside `@scope ([data-rendered])` — where they could never match because the `.dark` class lives on `<html>`, not on the scope element. As a result the light-mode `:root { … }` extracted cleanly and applied globally, but the dark-mode override was effectively dead, leaving WP-rendered content stuck on the light palette even after the app toggled to dark.

`extractCSSVariables` now matches `:root` / `:host` chained with attached modifiers (`.dark`, `[data-theme="x"]`, `#id`, `:where(.dark)`, etc.) — anything that still targets the document root without a descendant combinator — and preserves the original selector when emitting the extracted block globally. So `:root.dark { --bg: black }` stays as `:root.dark { --bg: black }` outside the `@scope` wrapper and fires correctly the moment the `.dark` class lands on `<html>`. Plain `:root .foo { … }` (a descendant selector, not a root variable block) is unaffected and still scopes.

Comma-separated lists like `:root, :host { … }` also now retain their original selector on extraction (was previously collapsing to just `:root`).
