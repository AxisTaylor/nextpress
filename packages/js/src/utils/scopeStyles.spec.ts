import { scopeStylesheet, scopeInlineStyles } from './scopeStyles';

describe('scopeStylesheet', () => {
  it('wraps non-variable rules in @scope ([data-rendered])', () => {
    const out = scopeStylesheet('.foo { color: red; }');
    expect(out).toContain('@scope ([data-rendered]) {');
    expect(out).toContain('.foo { color: red; }');
  });

  it('extracts :root variable-only blocks and keeps them top-level', () => {
    const out = scopeStylesheet(':root { --foo: red; --bar: blue; } .x { color: var(--foo); }');
    expect(out).toMatch(/^:root\{--foo: red; --bar: blue;\}/);
    expect(out).toContain('@scope ([data-rendered]) {');
    expect(out).toContain('.x { color: var(--foo); }');
  });

  it('keeps :root blocks that also contain non-variable declarations inside @scope', () => {
    const out = scopeStylesheet(':root { --foo: red; color: blue; }');
    expect(out).not.toMatch(/^:root\{/);
    // :root is rewritten to :scope inside the @scope wrapper
    expect(out).toContain(':scope { --foo: red; color: blue; }');
  });

  it('rewrites body and html selectors to & (scope root reference)', () => {
    const out = scopeStylesheet('body { margin: 0; } html.dark { color: white; }');
    expect(out).toContain('& { margin: 0; }');
    expect(out).toContain('&.dark { color: white; }');
    expect(out).not.toMatch(/(?<![&-])body\b/);
    expect(out).not.toMatch(/(?<![&-])html\b/);
  });

  it('does NOT wrap output in @layer by default', () => {
    const out = scopeStylesheet('.foo { color: red; }');
    expect(out).not.toContain('@layer');
  });

  it('wraps the @scope block in @layer when options.layer is provided', () => {
    const out = scopeStylesheet('.foo { color: red; }', { layer: 'wp-theme' });
    expect(out).toContain('@layer wp-theme {');
    expect(out).toContain('@scope ([data-rendered]) {');
    // @layer must come outside @scope, not the other way around
    expect(out.indexOf('@layer wp-theme')).toBeLessThan(out.indexOf('@scope'));
  });

  it('keeps :root variable blocks OUTSIDE the @layer wrapper', () => {
    const out = scopeStylesheet(
      ':root { --foo: red; } .x { color: var(--foo); }',
      { layer: 'wp-base' },
    );
    // Variables must come first, unlayered
    expect(out.indexOf(':root{--foo: red;}')).toBeLessThan(out.indexOf('@layer wp-base'));
    expect(out.indexOf('@layer wp-base')).toBeLessThan(out.indexOf('@scope'));
  });

  it('handles empty input without crashing', () => {
    const out = scopeStylesheet('');
    expect(out).toContain('@scope ([data-rendered]) {');
  });

  it('preserves @layer-wrapped :root variable blocks (Tailwind v4 pattern)', () => {
    const css = '@layer theme { :root, :host { --tw-color: red; } } .x { color: var(--tw-color); }';
    const out = scopeStylesheet(css);
    // Tailwind's theme layer variables stay unscoped — original selector preserved.
    expect(out).toContain('@layer theme{:root, :host{--tw-color: red;}}');
    // App rules still get scoped
    expect(out).toContain('@scope ([data-rendered]) {');
    expect(out).toContain('.x { color: var(--tw-color); }');
  });

  it('keeps :root.dark { --vars } blocks unscoped with their original selector', () => {
    // Regression: previously `:root.dark` was rewritten to `:scope.dark` inside
    // the @scope wrapper, where it could never match because `.dark` lives on
    // <html>, not on the [data-rendered] scope element. The light :root { … }
    // block extracted fine, so dark-mode token swaps were lost.
    const css = ':root { --bg: white; } :root.dark { --bg: black; } .x { background: var(--bg); }';
    const out = scopeStylesheet(css);
    expect(out).toContain(':root{--bg: white;}');
    expect(out).toContain(':root.dark{--bg: black;}');
    // Neither :root block should reappear inside the @scope rewrite.
    const scopeStart = out.indexOf('@scope (');
    expect(out.indexOf(':root', scopeStart)).toBe(-1);
    expect(out.indexOf(':scope.dark')).toBe(-1);
    // Non-root rule still scoped.
    expect(out).toContain('.x { background: var(--bg); }');
  });

  it('extracts :root[data-theme="x"] and :root:where(.dark) variable blocks unscoped', () => {
    const css = ':root[data-theme="dark"] { --bg: black; } :root:where(.dark) { --fg: white; }';
    const out = scopeStylesheet(css);
    expect(out).toContain(':root[data-theme="dark"]{--bg: black;}');
    expect(out).toContain(':root:where(.dark){--fg: white;}');
  });

  it('extracts :root blocks even when they contain inline CSS comments', () => {
    // Regression: a `/* … */` between declarations made `isVariablesOnly`
    // return false (split-by-`;` produced a piece starting with `/`, not
    // `--`). The block fell through to the scope rewrite and became
    // `:scope { … }`, shadowing dark-mode tokens for descendants of the
    // scope element. Comments are stripped at the top of scopeStylesheet
    // so this kind of authoring no longer breaks extraction.
    const css = `:root {
      --fg: cello;
      /* Gradient docblock that previously broke extraction.
       * Multi-line, with intentionally tricky tokens like ; and {} in prose.
       */
      --gradient: linear-gradient(180deg, red, blue);
    }`;
    const out = scopeStylesheet(css);
    expect(out).toMatch(/^:root\{/);
    expect(out).toContain('--fg: cello');
    expect(out).toContain('--gradient: linear-gradient(180deg, red, blue)');
    // No comment text survives in the output.
    expect(out).not.toContain('Gradient docblock');
    // Nothing leaks back into the @scope wrapper.
    const scopeStart = out.indexOf('@scope (');
    expect(out.indexOf(':scope', scopeStart)).toBe(-1);
  });

  it('extracts :root.dark blocks that contain inline comments', () => {
    const css = `:root.dark {
      /* Dark-theme tokens */
      --bg: black;
      --fg: white;
    }`;
    const out = scopeStylesheet(css);
    expect(out).toContain(':root.dark{');
    expect(out).toContain('--bg: black');
    expect(out).toContain('--fg: white');
  });

  it('still scopes :root blocks that mix variables with real declarations', () => {
    // Comment-stripping must not paper over genuine non-variable rules.
    // A block with `color: blue` alongside `--foo` is NOT variables-only
    // and must go through the scope rewrite.
    const css = ':root { /* a comment */ --foo: red; color: blue; }';
    const out = scopeStylesheet(css);
    expect(out).not.toMatch(/^:root\{/);
    // The stripped block reaches the rewrite without the comment text.
    // (Whitespace left where the comment used to be is fine — CSS doesn't
    // care, and collapsing it could merge tokens elsewhere.)
    expect(out).toMatch(/:scope\s*\{\s*--foo:\s*red;\s*color:\s*blue;\s*\}/);
    expect(out).not.toContain('a comment');
  });

  it('strips selector-position comments before the scope rewrite', () => {
    // A comment inside or beside a selector shouldn't break selector
    // matching downstream. After stripping, the selector is canonical.
    const css = `body /* leading */ { margin: 0; } /* between */ .x { color: red; }`;
    const out = scopeStylesheet(css);
    expect(out).toMatch(/&\s*\{\s*margin:\s*0;\s*\}/);
    expect(out).toMatch(/\.x\s*\{\s*color:\s*red;\s*\}/);
    expect(out).not.toContain('leading');
    expect(out).not.toContain('between');
  });

  it('does NOT extract :root with descendant combinators (those are real descendant rules)', () => {
    // `:root .foo` is a descendant selector — not a root variable block.
    // It must NOT be extracted; the `.foo` part is a real scoped match.
    const css = ':root .foo { --bg: red; }';
    const out = scopeStylesheet(css);
    // Should land inside @scope, with :root rewritten to :scope.
    expect(out).toContain(':scope .foo { --bg: red; }');
  });
});

describe('scopeInlineStyles', () => {
  it('delegates to scopeStylesheet with no options', () => {
    expect(scopeInlineStyles('.foo { color: red; }')).toBe(scopeStylesheet('.foo { color: red; }'));
  });

  it('forwards the layer option through to scopeStylesheet', () => {
    const out = scopeInlineStyles('.foo { color: red; }', { layer: 'wp-theme' });
    expect(out).toContain('@layer wp-theme {');
  });
});
