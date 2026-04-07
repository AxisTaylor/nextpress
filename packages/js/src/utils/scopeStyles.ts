const SCOPE_SELECTOR = '[data-rendered]';

/**
 * Extracts :root blocks that contain only CSS custom property declarations
 * (--variable: value) and returns them separately from the rest of the CSS.
 * These variable blocks are safe to leave global since CSS variables only
 * take effect when referenced via var() inside a scoped rule.
 */
function extractRootVariables(css: string): { variables: string; rest: string } {
  const variableBlocks: string[] = [];

  // Match :root { ... } blocks where the content is only variable declarations.
  // A variable-only block contains only lines matching --name: value;
  const rest = css.replace(
    /:root\s*\{([^}]+)\}/g,
    (_match, content: string) => {
      const trimmed = content.trim();
      // Check if every declaration is a custom property
      const isAllVariables = trimmed
        .split(';')
        .filter((s: string) => s.trim().length > 0)
        .every((decl: string) => decl.trim().startsWith('--'));

      if (isAllVariables) {
        variableBlocks.push(`:root{${trimmed}}`);
        return '';
      }

      // Mixed block — keep it in place for scoping
      return _match;
    }
  );

  return {
    variables: variableBlocks.join('\n'),
    rest,
  };
}

/**
 * Scopes a stylesheet to only apply within [data-rendered] elements.
 *
 * Extracts :root variable-only blocks and emits them globally (CSS variables
 * are inert until referenced via var() so they're safe to leave unscoped).
 * Rewrites remaining body/html/:root selectors to the scope root reference (&)
 * and wraps in @scope.
 */
export function scopeStylesheet(css: string): string {
  const { variables, rest } = extractRootVariables(css);

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
      '&'
    );

  const scoped = `@scope (${SCOPE_SELECTOR}) {\n${rewritten}\n}`;

  if (variables) {
    return `${variables}\n${scoped}`;
  }

  return scoped;
}

/**
 * Scopes inline CSS content for use in style tags.
 */
export function scopeInlineStyles(css: string): string {
  return scopeStylesheet(css);
}
