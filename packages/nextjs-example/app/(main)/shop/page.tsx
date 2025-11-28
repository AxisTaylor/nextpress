import Link from 'next/link';
import Image from 'next/image';
import { fetchProducts } from '@/lib/utils';

/**
 * WooCommerce Shop Page
 *
 * Displays product grid with cards linking to individual product pages
 */
export default async function ShopPage() {
  const products = await fetchProducts();

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Shop</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          const isVariable = product.type === 'VARIABLE';

          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100">
                {product.image ? (
                  <Image
                    src={product.image.sourceUrl}
                    alt={product.image.altText || product.name}
                    fill
                    sizes={product.image.sizes}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {product.name}
                </h2>

                {/* Price or Options Button */}
                {isVariable ? (
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    Show Options
                  </button>
                ) : product.price ? (
                  <div className="flex items-center gap-2">
                    {product.salePrice && product.salePrice !== product.regularPrice ? (
                      <>
                        <span className="text-lg font-bold text-red-600">
                          <span dangerouslySetInnerHTML={{ __html: product.salePrice }} />
                        </span>
                        <span className="text-sm line-through text-gray-500">
                          <span dangerouslySetInnerHTML={{ __html: product.regularPrice || '' }} />
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">
                        <span dangerouslySetInnerHTML={{ __html: product.price }} />
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No products found.</p>
        </div>
      )}
    </div>
  );
}
