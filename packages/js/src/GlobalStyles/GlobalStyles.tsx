import React, { Fragment } from 'react';
import { GlobalStylesType } from '@/types';
import { scopeInlineStyles } from '@/utils/scopeStyles';
import { replaceProxyPlaceholders } from '@/compatibility/woocommerce';

export interface GlobalStylesProps {
  globalStyles: GlobalStylesType;
  instance?: string;
  pathname?: string;
  /**
   * Defer the `@font-face` block — render it with `media="print"`
   * and `data-np-defer` so the same swap script `Stylesheets`
   * emits promotes it to `media="all"` on the next tick. Stops
   * font face declarations from blocking first paint when the
   * page hasn't actually used any of those fonts above the fold.
   * Defaults to `true`; set to `false` to keep font faces active
   * on initial paint.
   */
  deferFonts?: boolean;
  /**
   * Defer the theme.json `stylesheet` block (CSS custom property
   * bindings + base block-supports rules). Defaults to `false`
   * because these usually carry layout-critical tokens — opt in
   * only when you can absorb a token-flash on first paint, or when
   * the app shell repaints the relevant area anyway. Apply alongside
   * `deferFonts` to lift both off the critical path.
   */
  deferGlobalStyles?: boolean;
  /**
   * Skip the WP `@font-face` block entirely. Set to `true` when the
   * host app is loading its own webfonts (e.g. via `next/font`) and
   * doesn't want the WP-proxied font-face declarations re-injected.
   * Suppresses the `<style id="nextpress-font-faces">` element and
   * the swap-script that would have flipped its media attribute.
   * Takes precedence over `deferFonts`.
   */
  skipFonts?: boolean;
}

// Type loophole: `style[media]` is a valid HTML attribute but
// JSX.IntrinsicElements['style'] (per React 19's typings) misses
// the standard MediaQuery type. Cast to a type that accepts it.
type StyleEl = React.FC<
  JSX.IntrinsicElements['style'] & { media?: string; 'data-np-defer'?: string }
>;
const Style = 'style' as unknown as StyleEl;

// Same swap script `Stylesheets` ships — duplicated here so the
// font-face deferral works in setups that use `GlobalStyles`
// standalone (or with all stylesheets marked critical). Idempotent
// against multiple emissions: every run promotes any unpromoted
// `data-np-defer` element to `media="all"`, and a subsequent run
// finds nothing to do.
const FONT_DEFER_SWAP_SCRIPT = "(function(){function s(l){l.media='all';}document.querySelectorAll('link[data-np-defer],style[data-np-defer]').forEach(function(l){if(l.sheet){s(l);}else{l.addEventListener('load',function(){s(l);},{once:true});}});})();";

/**
 * Renders global WordPress styles from theme.json, custom CSS, and font faces.
 * These are styles that WordPress outputs on every page but are not included
 * in per-page enqueued assets.
 *
 * Font faces are deferred by default (see `deferFonts`) since they
 * don't usually affect first paint — text renders with system
 * fallbacks until the web font finishes downloading. Theme.json
 * `stylesheet` content + `customCss` are kept on the critical path
 * because they carry CSS custom property bindings and layout rules
 * that DO affect first paint.
 */
export function GlobalStyles({
  globalStyles,
  instance = 'default',
  pathname = '',
  deferFonts = true,
  deferGlobalStyles = false,
  skipFonts = false,
}: GlobalStylesProps) {
  const { stylesheet, customCss, renderedFontFaces } = globalStyles;

  // renderedFontFaces comes from wp_print_font_faces() which includes
  // its own <style> wrapper. Strip it so we can render cleanly, then
  // replace any NextPress proxy placeholders so font URLs route through
  // the proxy instead of hitting WordPress directly.
  const fontFaceCss = !skipFonts && renderedFontFaces
    ? replaceProxyPlaceholders(
        renderedFontFaces
          .replace(/<style[^>]*>/gi, '')
          .replace(/<\/style>/gi, '')
          .trim(),
        instance,
        pathname,
      )
    : null;

  return (
    <Fragment>
      {/*
        Register the wp-theme layer up front so theme.json globalStyles
        live below every other source of WP CSS in the cascade. Proxied
        .css (wp-block-library, plugin/theme CSS) stays unlayered so
        author styles can still override theme.json defaults by normal
        specificity + source order — wrapping proxied CSS in a layer was
        too aggressive (a theme's button.is-style-cta would lose to
        theme.json's generic button rule even at higher specificity).
        Per-instance core-block-supports inline content also stays
        unlayered so explicit block overrides still beat theme.json.
      */}
      <style
        id="nextpress-layer-order"
        data-nextpress="global"
        dangerouslySetInnerHTML={{ __html: '@layer wp-theme;' }}
      />
      {fontFaceCss && (
        <Style
          id="nextpress-font-faces"
          className="wp-fonts-local"
          data-nextpress="global"
          {...(deferFonts ? { media: 'print', 'data-np-defer': '1' } : {})}
          dangerouslySetInnerHTML={{ __html: fontFaceCss }}
        />
      )}
      {stylesheet && (
        <Style
          id="nextpress-global-styles"
          data-nextpress="global"
          {...(deferGlobalStyles ? { media: 'print', 'data-np-defer': '1' } : {})}
          dangerouslySetInnerHTML={{ __html: scopeInlineStyles(stylesheet, { layer: 'wp-theme' }) }}
          {...({ precedence: 'high' } as { precedence: string })}
        />
      )}
      {customCss && (
        <style
          id="nextpress-custom-css"
          data-nextpress="global"
          dangerouslySetInnerHTML={{ __html: scopeInlineStyles(customCss, { layer: 'wp-theme' }) }}
        />
      )}
      {((deferFonts && fontFaceCss) || (deferGlobalStyles && stylesheet)) && (
        <script
          id="nextpress-global-defer-swap"
          dangerouslySetInnerHTML={{ __html: FONT_DEFER_SWAP_SCRIPT }}
        />
      )}
    </Fragment>
  );
}
