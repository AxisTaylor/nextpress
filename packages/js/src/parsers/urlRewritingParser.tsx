import React, { FC } from 'react';
import {
  DOMNode,
  domToReact,
  Element,
} from 'html-react-parser';
import type { ElementProps, CustomParser } from '@/utils/parseHtml';

export interface UrlRewritingParserOptions {
  wpHomeUrl?: string;
  wpSiteUrl?: string;
  LinkComponent?: FC<JSX.IntrinsicElements['a']>;
  bypassExternalLinks?: boolean;
}

/**
 * Creates a URL rewriting parser that converts WordPress URLs to local Next.js routes
 * and renders all links using the provided LinkComponent.
 *
 * By default, all links (internal and external) use LinkComponent.
 * Pass bypassExternalLinks: true to only use LinkComponent for internal links.
 */
export function createUrlRewritingParser({
  wpHomeUrl,
  wpSiteUrl,
  LinkComponent = 'a' as unknown as FC<JSX.IntrinsicElements['a']>,
  bypassExternalLinks = false,
}: UrlRewritingParserOptions = {}): CustomParser {
  return (node: DOMNode, props: ElementProps, children?: DOMNode[] | DOMNode): JSX.Element | undefined => {
    const element = node as Element;

    // Handle anchor tag URL rewriting
    if (element.name === 'a' && props.href) {
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

      // Check if the link is external (http://, https://, or protocol-relative //)
      const isExternalLink = /^(https?:)?\/\//.test(href);

      // Skip external links if bypassExternalLinks is enabled
      if (bypassExternalLinks && isExternalLink) {
        return undefined;
      }

      return (
        <LinkComponent {...props} href={href}>
          {children && domToReact(children as Element[])}
        </LinkComponent>
      );
    }

    return undefined;
  };
}