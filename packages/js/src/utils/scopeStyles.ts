const SCOPE_SELECTOR = '[data-rendered]';

/**
 * Strips CSS block comments from a string. CSS comments can't nest, so a
 * non-greedy match between the slash-star and star-slash delimiters is
 * sufficient.
 *
 * Comments are stripped once at the top of `scopeStylesheet` so every
 * downstream pass — `extractCSSVariables`, `isVariablesOnly`, the
 * `:root` -> `:scope` rewrite — runs on canonical CSS. This avoids two
 * classes of bug:
 *
 *  1. Variables-only blocks slipping through to the scope rewrite
 *     because a docblock between declarations made `isVariablesOnly`
 *     return false (split-by-`;` produced a piece starting with `/`).
 *  2. Selectors hiding inside comments accidentally matching the
 *     `:root` / `body` / `html` rewrite regexes.
 */
function stripCssComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Returns true when every semicolon-separated declaration in the block is a
 * CSS custom property (`--name: value`).
 */
function isVariablesOnly(content: string): boolean {
  return content
    .trim()
    .split(';')
    .filter((s: string) => s.trim().length > 0)
    .every((decl: string) => decl.trim().startsWith('--'));
}

// `:root` or `:host`, optionally chained with attached modifiers — class
// (`.dark`), id, attribute, or pseudo (`:where(...)`, `:not(.x)`). Crucially
// excludes descendant / child / sibling combinators (space, >, +, ~) so we
// only catch selector chains that still target the document root.
//
// Examples that match:  :root  :host  :root.dark  :root[data-theme="x"]
//                       :root:where(.dark)  :root, :host
// Examples that don't:  :root .foo   :root > .bar
const ROOT_PIECE = `(?::root|:host)(?:\\.[\\w-]+|\\[[^\\]]*\\]|#[\\w-]+|:[\\w-]+(?:\\([^)]*\\))?)*`;
const ROOT_SELECTOR_LIST = `(?:${ROOT_PIECE}\\s*(?:,\\s*${ROOT_PIECE}\\s*)*)`;

/**
 * Extracts :root / :host variable-only blocks from CSS and returns them
 * separately so they can remain global (unscoped). CSS variables are inert
 * until referenced via var() inside a scoped rule, so leaving them at root
 * level is safe — and necessary for the cascade to resolve correctly across
 * scope boundaries (e.g. `:root.dark` token swaps for dark mode).
 *
 * Handles:
 *   - Plain :root { --vars }
 *   - :root, :host { --vars }
 *   - :root.dark { --vars }, :root[data-theme="x"] { --vars }, :root:where(.dark) { --vars }
 *   - @layer name { :root, :host { --vars } }  (Tailwind v4 pattern)
 *
 * The original selector chain is preserved on the extracted rule so
 * variants like `:root.dark` still match when the relevant class is
 * applied to the document root. Previously only the plain `:root` selector
 * was preserved — `:root.dark` blocks fell through to the scope rewrite
 * and never matched at runtime (`.dark` lives on <html>, not on the
 * `[data-rendered]` scope element).
 */
function extractCSSVariables(css: string): { variables: string; rest: string } {
  const variableBlocks: string[] = [];

  // 1. Extract @layer blocks that contain ONLY :root/:host variable declarations.
  const layerRe = new RegExp(
    `@layer\\s+([\\w-]+)\\s*\\{\\s*(${ROOT_SELECTOR_LIST})\\s*\\{([^}]+)\\}\\s*\\}`,
    'g',
  );
  let rest = css.replace(layerRe, (_match, layerName: string, selector: string, content: string) => {
    if (isVariablesOnly(content)) {
      variableBlocks.push(`@layer ${layerName}{${selector.trim()}{${content.trim()}}}`);
      return '';
    }
    return _match;
  });

  // 2. Extract top-level :root[…] { … } / :root, :host { … } blocks.
  const rootRe = new RegExp(`(${ROOT_SELECTOR_LIST})\\s*\\{([^}]+)\\}`, 'g');
  rest = rest.replace(rootRe, (_match, selector: string, content: string) => {
    if (isVariablesOnly(content)) {
      variableBlocks.push(`${selector.trim()}{${content.trim()}}`);
      return '';
    }
    return _match;
  });

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
 * Strips CSS block comments up front, then extracts :root variable-only
 * blocks and emits them globally (CSS variables are inert until referenced
 * via var() so they're safe to leave unscoped). Rewrites remaining
 * body/html/:root selectors to the scope root reference (&) and wraps in
 * @scope, optionally inside @layer.
 */
export function scopeStylesheet(
  css: string,
  options: ScopeStylesheetOptions = {},
): string {
  const stripped = stripCssComments(css);
  const { variables, rest } = extractCSSVariables(stripped);

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
