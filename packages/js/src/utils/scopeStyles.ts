const SCOPE_SELECTOR = '[data-content]';

/**
 * Scopes a stylesheet to only apply within [data-content] elements.
 * Rewrites body/html selectors to the scope root and wraps in @scope.
 * Leaves :root unscoped so CSS custom properties remain globally available.
 */
export function scopeStylesheet(css: string): string {
  // Rewrite body and html selectors to & (scope root reference)
  // Handles: body, html, body.class, html[attr], etc.
  // Does NOT rewrite :root to preserve CSS variable availability
  const rewritten = css.replace(
    /(?<=^|[,{\s])(body|html)(?=[,{\s.#:\[>+~]|$)/gm,
    '&'
  );

  return `@scope (${SCOPE_SELECTOR}) {\n${rewritten}\n}`;
}

/**
 * Scopes inline CSS content for use in style tags.
 */
export function scopeInlineStyles(css: string): string {
  return scopeStylesheet(css);
}
