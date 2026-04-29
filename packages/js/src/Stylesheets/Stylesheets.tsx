import React, {
  Fragment,
  FC,
  ReactNode,
} from 'react';
import { preinit } from 'react-dom';

import { EnqueuedStylesheet } from '@/types';
import { scopeInlineStyles } from '@/utils/scopeStyles';

export interface StyleProps {
  id?: string;
  precedence?: string;
  href?: string;
  children?: ReactNode;
}

const Style = 'style' as unknown as FC<StyleProps>;

export type StylesheetsProps = {
  stylesheets: EnqueuedStylesheet[];
  instance?: string;
  pathname?: string;
};

/**
 * Extracts the path from a URL, removing the protocol and domain
 */
function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    // If URL parsing fails, assume it's already a path
    return url;
  }
}

export function resolveStylesheetHref(src: string, instance: string): string {
  const isInternalRoute = /^\/wp-(?:includes|admin)\//;
  // Extract path from full URL if needed
  const path = extractPath(src);

  if (isInternalRoute.test(path)) {
    // Internal WordPress path (e.g., /wp-includes/css/... or /wp-admin/css/...)
    return `/atx/${instance}/wp-internal-assets${path}`;
  } else {
    // WordPress content path (e.g., /wp-content/...)
    return `/atx/${instance}/wp-assets${path}`;
  }
}

export function Stylesheets({ stylesheets, instance = 'default', pathname: _pathname = '' }: StylesheetsProps) {
  

  return (
    <Fragment>
      <Style id="nextpress-stylesheets-start">{`/* nextpress:stylesheets-start */`}</Style>
      {stylesheets.map((stylesheet) => {
        const { handle, src } = stylesheet;

        // Determine the correct href for the stylesheet
        let href = '';
         if (src) {
          href = resolveStylesheetHref(src, instance);
          preinit(href, { as: 'style', precedence: handle as string });
        }
        const Link = 'link' as unknown as FC<JSX.IntrinsicElements['link'] & { precedence: string }>;
        return (
          <Fragment key={handle}>
            {stylesheet.before && (
              <Style id={`${handle}-before`} precedence={handle as string} href={`${handle}-before-inline`}>
                {scopeInlineStyles(stylesheet.before.join(''))}
              </Style>
            )}
            {href && (
              <Link rel="stylesheet" href={href} id={`${handle}-css`} precedence={handle as string} />
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
    </Fragment>
  );
}
