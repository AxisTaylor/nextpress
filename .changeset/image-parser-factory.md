---
"@axistaylor/nextpress": minor
---

Refactor `nextImageParser` from a static parser const into a factory `nextImageParser({ instance?, render? })`. The factory resolves the WordPress instance config via `getWPInstance` / `getAllWPInstances` and routes same-host `<img>` src values through the existing wp-assets proxy by calling `resolveAssetHref` — so consumers no longer need to add their WordPress origin to `images.remotePatterns` in `next.config.js`. Cross-origin images still pass through unchanged.

Adds a new `render` option that takes a component receiving `ImageProps`, defaulting to `next/image`'s `Image`. This is the recommended hook for centralizing app-wide image presentation (rounded corners, default `sizes`, placeholder strategy, etc.) without losing the proxy / attribute-conversion behaviour.

Also exports `toImageProps(attrs, src)` — the pure conversion layer that turns a parsed `<img>`'s attribute map into a Next.js `ImageProps` object (handles `width`/`height` numeric coercion, `sizes`, `loading`, `fetchPriority` → `priority`, `crossOrigin`, `referrerPolicy`, `data-*` passthrough, plus `className` / `style` / `title` / `id`). Reusable when writing a custom parser that still wants the standard attribute mapping.

**Breaking:** `nextImageParser` is no longer a parser itself — invocation is now required. Migrate `parsers={[nextImageParser]}` → `parsers={[nextImageParser()]}` (or `parsers={[nextImageParser({ instance: '<slug>' })]}` when not using the default single-instance setup).
