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
        Register layer order before any layered content loads. wp-base is the
        lowest tier (proxied .css files from assetsByUri — wp-block-library,
        plugin/theme CSS files); wp-theme sits above (globalStyles +
        customCss). Everything else stays unlayered and wins over both,
        which is what we want for per-instance core-block-supports rules
        and app-level CSS.
      */}
      <style
        id="nextpress-layer-order"
        data-nextpress="global"
        dangerouslySetInnerHTML={{ __html: '@layer wp-base, wp-theme;' }}
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
