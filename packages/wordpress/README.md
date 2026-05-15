<!--
title: "NextPress WordPress Plugin"
description: "WordPress plugin that extends WPGraphQL with enqueued asset queries and theme.json output, so Next.js frontends can render Gutenberg content 1:1 with the WordPress backend."
keywords: "NextPress, WordPress plugin, WPGraphQL, headless WordPress, Next.js, Gutenberg"
-->

# NextPress WordPress Plugin

WPGraphQL extension that exposes the data a headless Next.js frontend needs to render Gutenberg content 1:1 with the WordPress backend: per-URI enqueued scripts and stylesheets, theme.json `globalStyles`, font faces, the import map, and the resolved content body.

This is the **WordPress half** of [NextPress](https://github.com/AxisTaylor/nextpress). The matching Next.js consumer ships as the [`@axistaylor/nextpress`](https://www.npmjs.com/package/@axistaylor/nextpress) npm package.

## Requirements

- WordPress 6.0+
- PHP 7.4+
- [WPGraphQL](https://wordpress.org/plugins/wp-graphql/) 1.27.0+

## Installation

### Via Composer (recommended)

The plugin is published on [Packagist as `axistaylor/nextpress`](https://packagist.org/packages/axistaylor/nextpress) and registered as a `wordpress-plugin` type, so [Composer-managed WordPress installs](https://composer.rarst.net/recipe/site-stack/) (Bedrock, [johnpbloch/wordpress](https://github.com/johnpbloch/wordpress), or any setup that has [`composer/installers`](https://packagist.org/packages/composer/installers) configured) will land it in `wp-content/plugins/nextpress/` automatically:

```bash
composer require axistaylor/nextpress
```

To pin to a specific version:

```bash
composer require axistaylor/nextpress:^1.2
```

If your site doesn't already have `composer/installers` set up, add it alongside the plugin and tell composer where `wordpress-plugin` packages belong:

```json
{
  "require": {
    "axistaylor/nextpress": "^1.2",
    "composer/installers": "^2.0"
  },
  "extra": {
    "installer-paths": {
      "wp-content/plugins/{$name}/": ["type:wordpress-plugin"]
    }
  }
}
```

Then activate the plugin:

```bash
wp plugin activate nextpress
```

### Manual installation

Download the latest `nextpress.zip` from the [Releases page](https://github.com/AxisTaylor/nextpress/releases?q=wp-v) and upload it via **Plugins → Add New → Upload Plugin** in your WordPress admin, or extract it into `wp-content/plugins/nextpress/` directly.

## What it exposes via WPGraphQL

After activating the plugin, the WPGraphQL schema gains:

- `assetsByUri(uri: String!)` — enqueued scripts, stylesheets, and import map for a specific URI, simulated as if WordPress had rendered that page.
- `globalStyles` — theme.json compiled stylesheet, custom CSS, rendered `@font-face` declarations, and structured font-face data.
- `templateByUri(uri: String!)` — body classes, resolved content, and node-by-URI info for a single URI.

See the [WordPress plugin docs](https://github.com/AxisTaylor/nextpress/blob/main/docs/wordpress-plugin.md) for the full schema reference and example queries.

## Links

- [Source repository](https://github.com/AxisTaylor/nextpress) — the monorepo this plugin lives in
- [Distribution repository](https://github.com/AxisTaylor/nextpress-wp-plugin-dist) — the tagged snapshots Packagist serves from
- [Documentation](https://github.com/AxisTaylor/nextpress/tree/main/docs)
- [Issue tracker](https://github.com/AxisTaylor/nextpress/issues)

## License

[GPL-3.0-or-later](./LICENSE).
