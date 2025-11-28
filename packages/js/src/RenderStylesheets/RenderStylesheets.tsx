import React, {
  Fragment,
  FC,
  ReactNode,
} from 'react';

import { EnqueuedStylesheet } from "@/types";

export interface StyleProps {
  id?: string;
  precedence?: 'low'|'medium'|'high';
  href?: string;
  children?: ReactNode;
}

const Style = 'style' as unknown as FC<StyleProps>;

type RenderStylesheetsProps = {
  stylesheets: EnqueuedStylesheet[];
  instance?: string;
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

export function RenderStylesheets({ stylesheets, instance = 'default' }: RenderStylesheetsProps) {
  const isInternalRoute = /^\/wp-(?:includes|admin)\//;

  return (
    <Fragment>
      {stylesheets.map((stylesheet) => {
        const { handle, src } = stylesheet;

        // Determine the correct href for the stylesheet
        let href = '';
        if (src) {
          // Extract path from full URL if needed
          const path = extractPath(src);

          if (isInternalRoute.test(path)) {
            // Internal WordPress path (e.g., /wp-includes/css/... or /wp-admin/css/...)
            href = `/atx/${instance}/wp-internal-assets${path}`;
          } else {
            // WordPress content path (e.g., /wp-content/...)
            href = `/atx/${instance}/wp-assets${path}`;
          }
        }
        const Link = 'link' as unknown as FC<JSX.IntrinsicElements['link'] & { precedence: string }>;
        return (
          <Fragment key={handle}>
            {stylesheet.before && (
              <Style id={`${handle}-before`} precedence="low" href={href || undefined}>
                {stylesheet.before.join('')}
              </Style>
            )}
            {href && (
              <Link rel="stylesheet" href={href} id={handle as string} precedence="medium" />
            )}
            {stylesheet.after && (
              <Style id={`${handle}-after`} precedence="high" href={href || undefined}>
                {stylesheet.after.join('')}
              </Style>
            )}
          </Fragment>
        );
      })}
    </Fragment>
  );
}