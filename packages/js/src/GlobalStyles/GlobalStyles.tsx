import React, { Fragment } from 'react';
import { GlobalStylesType } from '@/types';
import { scopeInlineStyles } from '@/utils/scopeStyles';
import { replaceProxyPlaceholders } from '@/compatibility/woocommerce';

export interface GlobalStylesProps {
  globalStyles: GlobalStylesType;
  instance?: string;
  pathname?: string;
}

/**
 * Renders global WordPress styles from theme.json, custom CSS, and font faces.
 * These are styles that WordPress outputs on every page but are not included
 * in per-page enqueued assets.
 */
export function GlobalStyles({
  globalStyles,
  instance = 'default',
  pathname = '',
}: GlobalStylesProps) {
  const { stylesheet, customCss, renderedFontFaces } = globalStyles;

  // renderedFontFaces comes from wp_print_font_faces() which includes
  // its own <style> wrapper. Strip it so we can render cleanly, then
  // replace any NextPress proxy placeholders so font URLs route through
  // the proxy instead of hitting WordPress directly.
  const fontFaceCss = renderedFontFaces
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
        <style
          id="nextpress-font-faces"
          className="wp-fonts-local"
          data-nextpress="global"
          dangerouslySetInnerHTML={{ __html: fontFaceCss }}
        />
      )}
      {stylesheet && (
        <style
          id="nextpress-global-styles"
          data-nextpress="global"
          dangerouslySetInnerHTML={{ __html: scopeInlineStyles(stylesheet, { layer: 'wp-theme' }) }}
          precedence="high"
        />
      )}
      {customCss && (
        <style
          id="nextpress-custom-css"
          data-nextpress="global"
          dangerouslySetInnerHTML={{ __html: scopeInlineStyles(customCss, { layer: 'wp-theme' }) }}
        />
      )}
    </Fragment>
  );
}
