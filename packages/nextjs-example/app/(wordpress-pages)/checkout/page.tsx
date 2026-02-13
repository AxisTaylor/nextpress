import Page from '../[...uri]/page';

/**
 * WooCommerce Checkout Page
 */
export default async function CheckoutPage() {
  return <Page params={Promise.resolve({ uri: '/checkout' })} />;
}
