---
"@axistaylor/nextpress": patch
---

`AssetUpdater`: add a `bypassDomains` prop so scripts and stylesheets from listed origins (payment gateways, web fonts, analytics) load from their original URL instead of being routed through the instance asset proxy — where they 404 on client-side navigation (e.g. `https://js.stripe.com/v3/` → `/atx/<instance>/wp-assets/v3/`).

Domains are matched by hostname (scheme- and port-agnostic), with root domains covering subdomains — `stripe.com` covers `js.stripe.com`. This mirrors the server-side external-origin check, so the initial SSR markup and navigation-time markup (and the external-script dedupe key) stay in sync.

Also removes leftover `[AssetUpdater]` debug console logs.
