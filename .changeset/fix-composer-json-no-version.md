---
"@axistaylor/nextpress-wordpress": patch
---

Remove the static `"version"` field from `packages/wordpress/composer.json`. Packagist derives the package version from the dist repo's git tag (`v<X.Y.Z>` mirrored from the source `wp-v<X.Y.Z>` tag), so a hard-coded `composer.json` version competes with — and on some Composer setups overrides — the tag-derived version. Letting the tag be the single source of truth fixes that.
