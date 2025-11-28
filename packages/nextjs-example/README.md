# Example 01

This example showcases the rendering of WordPress content pages in an Next.js application.

## Prerequisties

- The Wordpress Backend must have been started with `npm run dev:wp-backend` or `npm run dev`

## Usage

With the WP Backend up and running, execute `npm run dev:wp-frontend` in the terminal from the repository root.

## Available pages

- `http://localhost:3000` - The WordPress sample page.
- `http://localhost:3000/product/*` - Product page for testing the `cart` and `checkout` pages, e.g. `http://localhost:3000/product/t-shirt-with-logo`
- `http://localhost:3000/cart` - Cart page
- `http://localhost:3000/checkout` - Checkout page
