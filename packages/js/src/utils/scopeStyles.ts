const SCOPE_SELECTOR = '[data-rendered]';

/**
 * Returns true when every semicolon-separated declaration in the block
 * is a CSS custom property (--name: value).
 */
function isVariablesOnly(content: string): boolean {
  return content
    .trim()
    .split(';')
    .filter((s: string) => s.trim().length > 0)
    .every((decl: string) => decl.trim().startsWith('--'));
}

/**
 * Extracts :root / :root,:host variable-only blocks from CSS and returns
 * them separately so they can remain global (unscoped). CSS variables are
 * inert until referenced via var() inside a scoped rule, so leaving them
 * at :root is safe and necessary for cross-scope resolution.
 *
 * Handles both plain `:root { ... }` blocks and those nested inside
 * `@layer` wrappers (e.g. Tailwind v4's `@layer theme { :root, :host { ... } }`).
 * Extracted blocks preserve their original `@layer` wrapper so layer
 * ordering is maintained.
 */
function extractCSSVariables(css: string): { variables: string; rest: string } {
  const variableBlocks: string[] = [];

  // 1. Extract @layer blocks that contain ONLY :root/:host variable declarations.
  //    Matches: @layer <name> { :root, :host { --vars } }
  let rest = css.replace(
    /@layer\s+([\w-]+)\s*\{(\s*(?::root|:host)[\s,]*(?::root|:host)*\s*\{([^}]+)\}\s*)\}/g,
    (_match, layerName: string, _inner: string, content: string) => {
      if (isVariablesOnly(content)) {
        variableBlocks.push(`@layer ${layerName}{:root{${content.trim()}}}`);
        return '';
      }
      return _match;
    }
  );

  // 2. Extract plain :root { ... } and :root, :host { ... } blocks at top level.
  rest = rest.replace(
    /(?::root|:host)[\s,]*(?::root|:host)*\s*\{([^}]+)\}/g,
    (_match, content: string) => {
      if (isVariablesOnly(content)) {
        variableBlocks.push(`:root{${content.trim()}}`);
        return '';
      }
      return _match;
    }
  );

  return {
    variables: variableBlocks.join('\n'),
    rest,
  };
}

export interface ScopeStylesheetOptions {
  /**
   * Optional cascade-layer name. When provided, the @scope block is
   * wrapped in `@layer <name> { ... }` so the rules sit below any
   * unlayered author CSS in the cascade.
   *
   * Use for foundational WP-derived CSS (proxied stylesheets, theme.json
   * globalStyles) that per-instance block-supports CSS and app CSS need
   * to override. Extracted `:root` variable blocks are NEVER layered —
   * they stay top-level so var() references resolve via inheritance.
   */
  layer?: string;
}

/**
 * Scopes a stylesheet to only apply within [data-rendered] elements.
 *
 * Extracts :root variable-only blocks and emits them globally (CSS variables
 * are inert until referenced via var() so they're safe to leave unscoped).
 * Rewrites remaining body/html/:root selectors to the scope root reference (&)
 * and wraps in @scope, optionally inside @layer.
 */
export function scopeStylesheet(
  css: string,
  options: ScopeStylesheetOptions = {},
): string {
  const { variables, rest } = extractCSSVariables(css);

  // Rewrite body, html, and :root selectors to & (scope root reference)
  // Handles: body, html, body.class, html[attr], :root :where(...), etc.
  // The lookbehind includes } to handle minified CSS like }body{
  const rewritten = rest
    .replace(
      /(?<=^|[,{}\s])(body|html)(?=[,{}\s.#:\[>+~]|$)/gm,
      '&'
    )
    .replace(
      /:root/g,
      ':scope'
    );

  const scopeBlock = `@scope (${SCOPE_SELECTOR}) {\n${rewritten}\n}`;
  const scoped = options.layer
    ? `@layer ${options.layer} {\n${scopeBlock}\n}`
    : scopeBlock;

  if (variables) {
    return `${variables}\n${scoped}`;
  }

  return scoped;
}

/**
 * Scopes inline CSS content for use in style tags.
 */
export function scopeInlineStyles(
  css: string,
  options: ScopeStylesheetOptions = {},
): string {
  return scopeStylesheet(css, options);
}
