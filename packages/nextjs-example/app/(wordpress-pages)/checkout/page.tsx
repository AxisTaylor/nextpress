import { FC } from 'react';
import { Content } from '@axistaylor/nextpress';
import { fetchContentByUri } from '@/lib/utils';
import Link from 'next/link';

/**
 * WooCommerce Checkout Page
 */
export default async function CheckoutPage() {
  const content = await fetchContentByUri('/checkout');
  if (!content) {
    console.error(`Failed to find page content for the checkout page`)
    return null;
  }
  return <Content content={content} linksAs={Link as unknown as FC<JSX.IntrinsicElements['a']>}/>;
}
