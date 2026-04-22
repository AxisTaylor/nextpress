---
"@axistaylor/nextpress": patch
"@axistaylor/nextpress-wordpress": patch
---

Fix CSS variable scoping and layout class support for WordPress content rendering.

- **`extractCSSVariables`**: Handles `:root`/`:host` blocks inside `@layer` wrappers (e.g. Tailwind v4's `@layer theme { :root, :host { ... } }`). Extracted blocks preserve their `@layer` wrapper for correct ordering.
- **`:root` → `:scope` rewrite**: Preserves 0,1,0 specificity inside `@scope` so layout spacing rules override block-level margin shorthands, matching WordPress's cascade behavior.
- **`contentCssClasses` GraphQL field**: New field on `ContentNode` returning layout CSS classes from the template's `core/post-content` block (`is-layout-constrained`, `has-global-padding`, etc.).
- **`Content` component**: Accepts `contentCssClasses` prop, renders an inner wrapper with layout classes. Uses `clsx` for class joining.
- **Custom block theme**: Added to backend-4-examples with Tailwind `@theme` variables, theme.json presets, light/dark mode, and Typography Showcase test page.
- **Complex block buttons**: Updated render.php files to use `wp-element-button` class for proper theme styling.
