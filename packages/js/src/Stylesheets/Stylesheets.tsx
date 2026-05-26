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

export type StylesheetsProps = {
  stylesheets: EnqueuedStylesheet[];
  instance?: string;
  pathname?: string;
};

export const resolveStylesheetHref = resolveAssetHref;

export function Stylesheets({ stylesheets, instance = 'default', pathname: _pathname = '' }: StylesheetsProps) {
  const { wpHomeUrl } = getWPInstance(instance);
  const otherInstances = Object.entries(getAllWPInstances())
    .reduce((acc, [slug, entry]) => {
      if (entry.wpHomeUrl === wpHomeUrl) {
        return acc;
      }
      acc[slug] = entry.wpHomeUrl;
      return acc;
    }, {} as Record<string, string>);

  return (
    <Fragment>
      <Style id="nextpress-stylesheets-start">{`/* nextpress:stylesheets-start */`}</Style>
      {stylesheets.map((stylesheet) => {
        const { handle, src } = stylesheet;

        let href = '';
        if (src) {
          href = resolveAssetHref(src, instance, wpHomeUrl, otherInstances);
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
