import { FC } from 'react';
import { Content } from '@axistaylor/nextpress';
import { fetchContentByUri } from '@/lib/utils';
import Link from 'next/link';

/**
 * WooCommerce Cart Page
 */
export default async function CartPage() {
  const content = await fetchContentByUri('/cart');
  if (!content) {
    console.error(`Failed to find page content for the cart page`)
    return null;
  }
  return <Content content={content} linksAs={Link as unknown as FC<JSX.IntrinsicElements['a']>} />;
}
