---
"@axistaylor/nextpress": major
---

Initial v1.0.0 release

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
