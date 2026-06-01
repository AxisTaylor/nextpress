---
"@axistaylor/nextpress": minor
---

Defer non-critical proxied stylesheets to stop them from render-blocking first paint.

`Stylesheets` (and `WPHead`, which forwards) accept a new optional `criticalHandles?: string[]` prop. Handles in the list keep the current render-blocking `<link rel="stylesheet">` + `preinit` behavior. Anything outside the list is rendered with `media="print"` + `data-np-defer="1"`; an inline swap-script promotes those links to `media="all"` on load (synchronously for cache hits via `link.sheet`). Cascade order is preserved because DOM order — not load order — drives the cascade, and `before`/`after` inline styles are untouched.

Omitting `criticalHandles` keeps every sheet blocking, matching previous behavior. Pass it from a layout to mark theme + critical layout sheets so they keep blocking while everything else defers:

```tsx
<WPHead
  scripts={scripts}
  stylesheets={stylesheets}
  globalStyles={globalStyles}
  importMap={importMap}
  pathname={uri}
  criticalHandles={['theme', 'wp-block-library']}
/>
```
