---
"@axistaylor/nextpress": minor
---

- Convert HeadScripts, BodyScripts, and Stylesheets to React Server Components using next/script
- HeadScripts renders with strategy="beforeInteractive", BodyScripts with strategy="afterInteractive"
- Rename RenderStylesheets to Stylesheets with React precedence attribute for automatic <head> hoisting
- Add pathname prop to all three components
- Remove client-side ScriptLoader and sortScriptsByDependencies — dependency ordering handled server-side by WordPress
- All components now exported from @axistaylor/nextpress (no more /client import path for scripts)
- Add WooCommerce compatibility: wc-settings URL transformation, proxy placeholder replacement, external script detection in BodyScripts
- Add bypassExternalLinks option to urlRewritingParser
- Add linksAs prop to Content for replacing <a> tags with custom components (e.g., Next.js Link)
