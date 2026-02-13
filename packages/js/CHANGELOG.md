# @axistaylor/nextpress

## 1.1.0

### Minor Changes

- [#14](https://github.com/AxisTaylor/nextpress/pull/14) [`3db1467`](https://github.com/AxisTaylor/nextpress/commit/3db1467902746fdeef135f0a77acfa8527fcfdd6) Thanks [@kidunot89](https://github.com/kidunot89)! - - Convert HeadScripts, BodyScripts, and Stylesheets to React Server Components using next/script
  - HeadScripts renders with strategy="beforeInteractive", BodyScripts with strategy="afterInteractive"
  - Rename RenderStylesheets to Stylesheets with React precedence attribute for automatic <head> hoisting
  - Add pathname prop to all three components
  - Remove client-side ScriptLoader and sortScriptsByDependencies — dependency ordering handled server-side by WordPress
  - All components now exported from @axistaylor/nextpress (no more /client import path for scripts)
  - Add WooCommerce compatibility: wc-settings URL transformation, proxy placeholder replacement, external script detection in BodyScripts
  - Add bypassExternalLinks option to urlRewritingParser
  - Add linksAs prop to Content for replacing <a> tags with custom components (e.g., Next.js Link)

## 1.0.1

### Patch Changes

- [#12](https://github.com/AxisTaylor/nextpress/pull/12) [`3fe4d99`](https://github.com/AxisTaylor/nextpress/commit/3fe4d9928cdd5a5896fb467b82421fa3486d8b96) Thanks [@kidunot89](https://github.com/kidunot89)! - Scope WordPress CSS to [data-content] to prevent style leakage into the Next.js app layout. Proxied CSS files are wrapped in @scope([data-content]) at the middleware level, and inline styles from RenderStylesheets are scoped at render time. Add woocommerce_ajax_get_endpoint filter to route WC AJAX URLs through the /atx/{slug}/wc proxy. Add style-isolation e2e test suite and update existing tests for /atx/ proxy paths.

## 1.0.0

### Major Changes

- [#3](https://github.com/AxisTaylor/nextpress/pull/3) [`8e9b3cf`](https://github.com/AxisTaylor/nextpress/commit/8e9b3cf26b879ceec34a3c08910a7b3417dd1225) Thanks [@kidunot89](https://github.com/kidunot89)! - Initial v1.0.0 release

  ## Features

  - **Content Component** - Render WordPress Gutenberg HTML content in React with customizable parsers
  - **HeadScripts & BodyScripts** - Load WordPress-enqueued scripts with proper dependency resolution and loading strategies
  - **RenderStylesheets** - Render WordPress stylesheets in correct order with inline styles support
  - **withWCR** - Next.js config wrapper for WordPress backend connection and automatic redirects
  - **proxyByWCR** - Middleware proxy for WordPress REST API, admin-ajax.php, and WooCommerce AJAX
  - **Multi-WordPress Support** - Connect to multiple WordPress backends with instance-based routing

  ## Requirements

  - Next.js 14.2.5+
  - React 18.3.1+
  - WordPress with WPGraphQL plugin
  - NextPress WordPress plugin
