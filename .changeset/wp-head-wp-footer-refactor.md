---
"@axistaylor/nextpress": minor
---

Rename HeadScripts/BodyScripts to WPHead/WPFooter, add Content parsers array, and migrate nextImageParser into the library.

- **WPHead** (formerly HeadScripts): now renders GlobalStyles, Stylesheets, ImportMap, and head scripts in one component. Deprecated `HeadScripts` alias still exported.
- **WPFooter** (formerly BodyScripts): renders footer scripts. Deprecated `BodyScripts` alias still exported.
- **Content `parsers` prop**: accepts `CustomParser[]` array. Deprecated single `parser` prop still works.
- **`nextImageParser`**: built-in parser that converts WP `<img>` to Next.js `<Image>`. Exported from `@axistaylor/nextpress/client`.
- **`createUrlRewritingParser`** and **`UrlRewritingParserOptions`** now exported from the main entry.
- **`instancesReadableOnClient`**: new `withWCR` option to expose WP instance config to client components.
- Added `next/image` and `next/navigation` to rollup externals.
