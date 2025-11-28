import { notFound } from 'next/navigation';
import { fetchProduct } from '@/lib/utils';
import { Product } from '@/components/Product';
import { ProductProvider } from '@/components/ProductProvider';

export interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * WooCommerce Product Page
 *
 * Renders a single product page using GraphQL product data
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const product = await fetchProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      <ProductProvider product={product}>
        <Product />
      </ProductProvider>
    </div>
  );
}
