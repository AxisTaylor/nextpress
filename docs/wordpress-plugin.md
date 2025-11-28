# NextPress WordPress Plugin

The NextPress WordPress plugin extends WPGraphQL to expose enqueued scripts and stylesheets, enabling your Next.js frontend to load WordPress assets correctly.

## Requirements

- WordPress 6.0+
- PHP 7.4+
- WPGraphQL 1.27.0+

## Installation

### Via Composer

```bash
composer require axistaylor/nextpress
```

### Manual Installation

1. Download the plugin from GitHub releases
2. Upload to `/wp-content/plugins/nextpress/`
3. Activate in WordPress admin

## GraphQL Schema

The plugin adds the `uriAssets` query to fetch scripts and stylesheets for a specific URI:

```graphql
query GetAssets($uri: String!) {
  uriAssets(uri: $uri) {
    scripts {
      handle
      src
      version
      location
      strategy
      dependencies
      extraData
      before
      after
    }
    stylesheets {
      handle
      src
      version
      media
      dependencies
      before
      after
    }
  }
}
```

### EnqueuedScript Type

| Field | Type | Description |
|-------|------|-------------|
| `handle` | `String!` | Script handle/identifier |
| `src` | `String!` | Script URL |
| `version` | `String` | Version number for cache busting |
| `location` | `ScriptLocation!` | `HEADER` or `FOOTER` |
| `strategy` | `ScriptStrategy` | `DEFER`, `ASYNC`, or `BLOCKING` |
| `dependencies` | `[String!]` | Dependency handles |
| `extraData` | `String` | Localized data (from `wp_localize_script`) |
| `before` | `String` | Inline script before main script |
| `after` | `String` | Inline script after main script |

### EnqueuedStylesheet Type

| Field | Type | Description |
|-------|------|-------------|
| `handle` | `String!` | Stylesheet handle/identifier |
| `src` | `String!` | Stylesheet URL |
| `version` | `String` | Version number for cache busting |
| `media` | `String` | Media query (e.g., `print`, `screen`) |
| `dependencies` | `[String!]` | Dependency handles |
| `before` | `String` | Inline CSS before stylesheet |
| `after` | `String` | Inline CSS after stylesheet |

## Settings Page

Navigate to **Settings > NextPress** in WordPress admin.

### CORS Settings

Configure Cross-Origin Resource Sharing for headless implementations:

| Setting | Description |
|---------|-------------|
| **Enable CORS** | Enable CORS headers for REST API requests |
| **Allowed Origins** | Newline-separated list of allowed frontend URLs |

Example allowed origins:
```
https://mysite.com
https://www.mysite.com
http://localhost:3000
```

### Headless Settings

Configure NextPress behavior for headless environments:

| Setting | Description | Default |
|---------|-------------|---------|
| **Replace wp-api-fetch Script** | Replace WordPress core `wp-api-fetch` with NextPress version for proper nonce handling and API routing through your Next.js proxy | On |
| **Replace WooCommerce Scripts** | (WooCommerce only) Replace WooCommerce scripts with versions using fresh nonces. Fixes stale nonce issues with WooCommerce Store API | On |
| **Transform Stripe Gateway URLs** | (WooCommerce Stripe only) Transform Stripe Gateway URLs to use NextPress proxy placeholders. Required for Stripe payments in headless environments | On |

## CORS Filters

Customize CORS behavior with these filters:

### nextpress_cors_enabled

Override whether CORS is enabled:

```php
add_filter('nextpress_cors_enabled', function($enabled) {
  // Force enable CORS
  return true;
});
```

### nextpress_cors_allowed_origins

Add additional allowed origins programmatically:

```php
add_filter('nextpress_cors_allowed_origins', function($origins) {
  $origins[] = 'https://staging.mysite.com';
  $origins[] = 'https://preview.mysite.com';
  return $origins;
});
```

### nextpress_cors_allowed_headers

Add custom headers to CORS allowlist:

```php
add_filter('nextpress_cors_allowed_headers', function($headers) {
  $headers[] = 'X-Custom-Header';
  return $headers;
});
```

### nextpress_cors_is_origin_allowed

Custom origin validation logic:

```php
add_filter('nextpress_cors_is_origin_allowed', function($allowed, $origin) {
  // Allow all subdomains of mysite.com
  if (preg_match('/^https?:\/\/([a-z0-9-]+\.)?mysite\.com$/', $origin)) {
    return true;
  }
  return $allowed;
}, 10, 2);
```

## Helper Functions

### nextpress_get_setting

Retrieve a NextPress setting value:

```php
$value = nextpress_get_setting('enable_cors', 'off');
```

**Parameters:**
- `$key` (string) - Setting key
- `$default` (mixed) - Default value if setting not found

**Available Settings:**
- `enable_cors` - CORS enabled state (`'on'` or `'off'`)
- `cors_origins` - Allowed origins (newline-separated string)
- `enable_custom_api_fetch` - wp-api-fetch replacement (`'on'` or `'off'`)
- `enable_custom_wc_scripts` - WooCommerce script replacement (`'on'` or `'off'`)
- `enable_stripe_url_transforms` - Stripe URL transforms (`'on'` or `'off'`)

## WooCommerce Integration

When WooCommerce is active, NextPress provides additional features:

### Fresh Nonces

WooCommerce Store API requires valid nonces for cart and checkout operations. The plugin's "Replace WooCommerce Scripts" setting ensures nonces are fresh for each request.

### Stripe Gateway Support

For WooCommerce Stripe Gateway, the "Transform Stripe Gateway URLs" setting rewrites payment URLs to work through the NextPress proxy.

## Multisite Support

NextPress is multisite compatible. Settings are per-site, allowing different configurations for each subsite.

## Related

- [Getting Started](./getting-started.md) - Initial setup
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [proxyByWCR](./proxy-by-wcr.md) - Proxy configuration
