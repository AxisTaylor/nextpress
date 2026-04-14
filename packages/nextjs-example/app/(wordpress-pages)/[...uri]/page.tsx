import { Content } from '@axistaylor/nextpress';
import { nextImageParser } from '@axistaylor/nextpress/client';
import { fetchContentByUri, fetchPageSlugs } from '@/lib/utils';
import Link from 'next/link';
import { FC } from 'react';

export interface PageParams {
  params: Promise<{
    uri?: string | string[];
  }>;
}

/**
 * Pre-build WordPress pages at build time.
 * Excludes cart/checkout (dynamic, user-specific nonces).
 */
export async function generateStaticParams() {
  const slugArrays = await fetchPageSlugs();
  return slugArrays.map(segments => ({ uri: segments }));
}

export default async function Page({ params: paramsPromise }: PageParams) {
  const params = await paramsPromise;
  let uri: string = '/';
  if (Array.isArray(params.uri)) {
    uri = params.uri.join('/');
  } else if (typeof params.uri === 'string') {
    uri = params.uri;
  }

  const content = await fetchContentByUri(uri);
  if (!content) {
    console.error(`Failed to find page content for: ${uri}`);
    return null;
  }
  return <Content content={content} linksAs={Link as unknown as FC<JSX.IntrinsicElements['a']>} parsers={[nextImageParser]} />;
}
