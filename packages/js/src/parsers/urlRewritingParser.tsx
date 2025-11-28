import React, { FC } from 'react';
import {
  DOMNode,
  domToReact,
  Element,
} from 'html-react-parser';
import type { ElementProps, CustomParser } from '@/utils/parseHtml';

/**
 * Creates a URL rewriting parser that converts WordPress URLs to local Next.js routes
 */
export function createUrlRewritingParser(wpHomeUrl?: string, wpSiteUrl?: string, LinkComponent = 'a' as unknown as FC<JSX.IntrinsicElements['a']>): CustomParser {
  return (node: DOMNode, props: ElementProps, children?: DOMNode[] | DOMNode): JSX.Element | undefined => {
    const element = node as Element;

    // Handle anchor tag URL rewriting
    if (element.name === 'a' && props.href && (wpHomeUrl || wpSiteUrl)) {
      let href = props.href as string;

      // Rewrite WordPress URLs to local routes
      if (wpHomeUrl && href.startsWith(wpHomeUrl)) {
        href = href.replace(wpHomeUrl, '');
      } else if (wpSiteUrl && href.startsWith(wpSiteUrl)) {
        href = href.replace(wpSiteUrl, '');
      }

      // Ensure href starts with / for local routes
      if (href && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('http')) {
        href = '/' + href;
      }

      // Only return if href was actually changed
      if (href !== props.href) {
        return (
          <LinkComponent {...props} href={href}>
            {children && domToReact(children as Element[])}
          </LinkComponent>
        );
      }
    }

    return undefined;
  };
}