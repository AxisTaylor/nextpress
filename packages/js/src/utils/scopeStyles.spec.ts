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
    // Tailwind's theme layer variables stay unscoped
    expect(out).toContain('@layer theme{:root{--tw-color: red;}}');
    // App rules still get scoped
    expect(out).toContain('@scope ([data-rendered]) {');
    expect(out).toContain('.x { color: var(--tw-color); }');
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
