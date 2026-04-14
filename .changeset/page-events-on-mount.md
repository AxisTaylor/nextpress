---
"@axistaylor/nextpress": patch
---

Fire synthetic DOMContentLoaded/load events on initial mount so WordPress scripts initialize on first page load.

- New `usePageEvents` hook and `firePageEvents` utility that dispatch synthetic `DOMContentLoaded`, `load`, and `nextpress:page-change` events
- New `<PageEvents>` client component for apps not using AssetUpdater
- `AssetUpdater` fires page events on initial mount (before skipping asset refresh) so WP scripts that listen for `DOMContentLoaded` can initialize — previously they only fired on client-side navigation
- Export `PageEvents`, `usePageEvents`, and `firePageEvents` from `@axistaylor/nextpress/client`
