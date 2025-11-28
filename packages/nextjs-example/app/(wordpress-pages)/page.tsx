import { FC } from 'react';
import { Content } from '@axistaylor/nextpress';
import { fetchContentByUri } from '@/lib/utils';
import Link from 'next/link';

/**
 * Homepage - Gutenberg Blocks Test Page
 */
export default async function Home() {
  const content = await fetchContentByUri('/');
  if (!content) {
    console.error(`Failed to find page content for the homepage`)
    return null;
  }
  return <Content content={content} linksAs={Link as unknown as FC<JSX.IntrinsicElements['a']>} />;
}
