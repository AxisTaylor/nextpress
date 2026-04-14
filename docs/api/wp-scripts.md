<!--
title: "WPScripts Component"
description: "Core server component that renders WordPress scripts for head or body, handling classic, deferred, async, and ES module scripts."
author: "AxisTaylor, LLC"
keywords: "NextPress, WPScripts, WordPress, scripts, modules, deferred, async, server component"
-->

# WPScripts

The `WPScripts` component is the core server component that renders WordPress enqueued scripts for a given location (head or body). It handles classic scripts, deferred/async scripts, and ES modules.

Most apps should use [`WPHead`](./wp-head.md) and [`WPFooter`](./wp-footer.md) instead of `WPScripts` directly — they are thin wrappers that combine `WPScripts` with other head/body concerns.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scripts` | `EnqueuedScript[]` | Yes | Array of WordPress scripts to render |
| `location` | `'head' \| 'body'` | Yes | Where to render scripts |
| `instance` | `string` | No | WordPress instance slug (default: `'default'`) |
| `pathname` | `string` | No | Current page pathname |

## Script Type Handling

| Script Type | Head Rendering | Body Rendering |
|-------------|---------------|----------------|
| Classic (no strategy) | `next/script` `beforeInteractive` | `next/script` `afterInteractive` |
| Deferred (`strategy: DEFER`) | `next/script` `afterInteractive` | `next/script` `afterInteractive` |
| Async (`strategy: ASYNC`) | `next/script` `beforeInteractive` | `next/script` `beforeInteractive` |
| Module (`type: MODULE`) | `<script type="module">` | `<script type="module">` |

ES modules are rendered as plain `<script type="module">` tags because `next/script` does not support the `type` attribute. Modules are deferred by the browser spec.

## Multisite Support

On WordPress multisite, plugin assets may originate from a different domain than the content site. WPScripts uses `isScriptForAnotherInstance()` to detect this and route the script through the correct instance's proxy, avoiding CORS issues.

## URL Proxying

WordPress asset URLs are automatically transformed:

- Content assets (`/app/plugins/...`, `/app/themes/...`) → `/atx/{instance}/wp-assets/...`
- Internal assets (`/wp-includes/...`, `/wp-admin/...`) → `/atx/{instance}/wp-internal-assets/...`
- External scripts (CDNs, payment gateways) in the body are loaded directly

## Related

- [WPHead](./wp-head.md) - Head wrapper (GlobalStyles + ImportMap + WPScripts)
- [WPFooter](./wp-footer.md) - Body wrapper
- [AssetUpdater](./asset-updater.md) - Client-side asset refresh
