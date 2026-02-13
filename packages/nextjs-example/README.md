# NextPress Example App

This example showcases rendering WordPress content pages in a Next.js application with WooCommerce integration.

## Prerequisites

- The WordPress Backend must have been started with `npm run dev:wp-backend` or `npm run dev`

## Usage

With the WP Backend up and running, execute `npm run dev:wp-frontend` in the terminal from the repository root.

## Available Pages

- `http://localhost:3000` - The WordPress sample page
- `http://localhost:3000/shop` - Product listing page
- `http://localhost:3000/product/*` - Product page, e.g. `http://localhost:3000/product/t-shirt-with-logo`
- `http://localhost:3000/cart` - Cart page (WooCommerce Blocks)
- `http://localhost:3000/checkout` - Checkout page (WooCommerce Blocks)
- `http://localhost:3000/checkout/order-received/[id]` - Order confirmation page

## Route Groups

### `(wordpress-pages)` - WordPress Content Pages

Pages rendered from WordPress Gutenberg content via the `assetsByUri` GraphQL query. Includes script/stylesheet loading through `HeadScripts`, `BodyScripts`, and `Stylesheets` components in the layout.

- `/` - Homepage
- `/[...uri]` - Catch-all for WordPress pages (with `generateStaticParams`)
- `/cart` - WooCommerce cart
- `/checkout` - WooCommerce checkout
- `/checkout/order-received/[orderId]` - Order confirmation

### `(main)` - Application Pages

Pages using WPGraphQL product data without WordPress scripts/styles.

- `/shop` - Product grid (ISR with `revalidate = 3600`)
- `/product/[slug]` - Individual product (ISR with `generateStaticParams`)
