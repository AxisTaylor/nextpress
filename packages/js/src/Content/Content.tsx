import React, { FC } from 'react';
import { getWPInstance } from '@/config/getWPInstance';
import { parseHtml, CustomParser } from '@/utils/parseHtml';
import { createUrlRewritingParser } from '@/parsers/urlRewritingParser';


export interface ContentProps {
  content: string;
  instance?: string;
  /** @deprecated Use `parsers` instead. */
  parser?: CustomParser;
  parsers?: CustomParser[];
  linksAs?: FC<JSX.IntrinsicElements['a']>;
  bypassExternalLinks?: boolean;
}

/**
 * Fixes invalid HTML structures commonly output by WordPress/WooCommerce.
 * Specifically fixes tables with <tr> directly under <table> by wrapping in <tbody>.
 */
function fixInvalidHtml(html: string): string {
  // Fix tables missing tbody wrapper
  // Matches: <table...><tr or <table...>\s*<tr
  // Replaces with: <table...><tbody><tr
  return html.replace(
    /(<table[^>]*>)(\s*)(<tr[\s>])/gi,
    '$1$2<tbody>$3'
  ).replace(
    /(<\/table>)/gi,
    '</tbody>$1'
  );
}

export function Content({ content, parser, parsers, instance = 'default', linksAs = 'a' as unknown as FC<JSX.IntrinsicElements['a']>, bypassExternalLinks = false }: ContentProps) {
  const fixedContent = fixInvalidHtml(content);

  // Check if formatPermalinks is enabled (defaults to true)
  const formatPermalinks = process.env.NEXTPRESS_FORMAT_PERMALINKS !== 'false';

  // Get URL rewriting parser if formatPermalinks is enabled
  let urlRewritingParser: CustomParser | undefined;
  if (formatPermalinks) {
    const { wpHomeUrl, wpSiteUrl } = getWPInstance(instance);
    urlRewritingParser = createUrlRewritingParser({
      wpHomeUrl,
      wpSiteUrl,
      LinkComponent: linksAs,
      bypassExternalLinks,
    });
  }

  // Combine all parsers: URL rewriting first, then user-provided parsers.
  // Support both deprecated single `parser` and new `parsers` array.
  const allParsers: (CustomParser | undefined)[] = [
    urlRewritingParser,
    ...(parsers || []),
    parser, // deprecated single parser last for backwards compat
  ];

  return (<div data-rendered="">{parseHtml(fixedContent, ...allParsers)}</div>);
}