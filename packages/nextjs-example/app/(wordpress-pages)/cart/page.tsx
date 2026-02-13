import Page from '../[...uri]/page';

/**
 * WooCommerce Cart Page
 */
export default async function CartPage() {
  return <Page params={Promise.resolve({ uri: '/cart' })} />;
}
