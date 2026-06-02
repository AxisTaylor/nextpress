import React, {
  Fragment,
  FC,
  ReactNode,
} from 'react';
import { preinit } from 'react-dom';

import { EnqueuedStylesheet } from '@/types';
import { getAllWPInstances, getWPInstance } from '@/config/getWPInstance';
import { scopeInlineStyles } from '@/utils/scopeStyles';
import { resolveAssetHref } from '@/utils/url';

export interface StyleProps {
  id?: string;
  precedence?: string;
  href?: string;
  children?: ReactNode;
}

const Style = 'style' as unknown as FC<StyleProps>;

// Promotes every `data-np-defer` element from `media="print"` to
// `media="all"` once its stylesheet has loaded.
//
// Two element types ride through the same swap:
//   * `<link rel="stylesheet" media="print">` — print-media stops
//     the request from blocking first paint. Promoting on `load`
//     reuses the print sheet (no second fetch). Cache hits arrive
//     with `.sheet` populated and no `load` event coming, so we
//     promote those synchronously.
//   * `<style media="print">` — inline rules (font faces are the
//     primary case). `.sheet` is populated synchronously on parse,
//     so we just check it and promote — no load event ever fires
//     for an inline `<style>`.
const DEFER_SWAP_SCRIPT = "(function(){function s(l){l.media='all';}document.querySelectorAll('link[data-np-defer],style[data-np-defer]').forEach(function(l){if(l.sheet){s(l);}else{l.addEventListener('load',function(){s(l);},{once:true});}});})();";

export type StylesheetsProps = {
  stylesheets: EnqueuedStylesheet[];
  instance?: string;
  pathname?: string;
  /**
   * Handles of stylesheets that should keep blocking first paint.
   * Anything not in this list ships with `media="print"` and gets
   * promoted to `media="all"` once the sheet has loaded — so
   * Lighthouse stops flagging it as render-blocking. Omit the
   * prop to defer every sheet (matches the previous default
   * behaviour but is no longer recommended for theme-critical
   * stylesheets).
   */
  criticalHandles?: string[];
};

export const resolveStylesheetHref = resolveAssetHref;

export function Stylesheets({ stylesheets, instance = 'default', pathname: _pathname = '', criticalHandles }: StylesheetsProps) {
  const { wpHomeUrl } = getWPInstance(instance);
  const otherInstances = Object.entries(getAllWPInstances())
    .reduce((acc, [slug, entry]) => {
      if (entry.wpHomeUrl === wpHomeUrl) {
        return acc;
      }
      acc[slug] = entry.wpHomeUrl;
      return acc;
    }, {} as Record<string, string>);

  const criticalSet = criticalHandles ? new Set(criticalHandles) : null;
  let anyDeferred = false;

  return (
    <Fragment>
      <Style id="nextpress-stylesheets-start">{`/* nextpress:stylesheets-start */`}</Style>
      {stylesheets.map((stylesheet) => {
        const { handle, src } = stylesheet;
        const isCritical = criticalSet ? criticalSet.has(handle as string) : false;

        let href = '';
        if (src) {
          href = resolveAssetHref(src, instance, wpHomeUrl, otherInstances);
          // preinit is render-blocking, so reserve it for the
          // critical-path sheets that we're already blocking on.
          if (isCritical) {
            preinit(href, { as: 'style', precedence: handle as string });
          }
        }
        const Link = 'link' as unknown as FC<
          JSX.IntrinsicElements['link'] & { precedence: string; 'data-np-defer'?: string }
        >;
        if (href && !isCritical) {
          anyDeferred = true;
        }
        return (
          <Fragment key={handle}>
            {stylesheet.before && (
              <Style id={`${handle}-before`} precedence={handle as string} href={`${handle}-before-inline`}>
                {scopeInlineStyles(stylesheet.before.join(''))}
              </Style>
            )}
            {href && (
              isCritical ? (
                <Link rel="stylesheet" href={href} id={`${handle}-css`} precedence={handle as string} />
              ) : (
                <Link
                  rel="stylesheet"
                  href={href}
                  id={`${handle}-css`}
                  precedence={handle as string}
                  media="print"
                  data-np-defer="1"
                />
              )
            )}
            {stylesheet.after && (
              <Style id={`${handle}-inline-css`} precedence={handle as string} href={`${handle}-after-inline`}>
                {scopeInlineStyles(stylesheet.after.join(''))}
              </Style>
            )}
          </Fragment>
        );
      })}
      <Style id="nextpress-stylesheets-end">{`/* nextpress:stylesheets-end */`}</Style>
      {anyDeferred && (
        <script
          id="nextpress-deferred-css-swap"
          dangerouslySetInnerHTML={{ __html: DEFER_SWAP_SCRIPT }}
        />
      )}
    </Fragment>
  );
}
