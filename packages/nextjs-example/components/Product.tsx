'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { addToCart, isInCart, removeCartItem } from '@/lib/cart';
import { useProduct } from '@/components/ProductProvider';

export function Product() {
  const { product, get, selectedVariation, selectVariation } = useProduct();
  const [inCart, setInCart] = useState<string | false>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!product) {
      return;
    }

    isInCart(product.databaseId, selectedVariation?.databaseId)
      .then(key => setInCart(key));
  }, [product, selectedVariation]);

  if (!product) {
    return null;
  }

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      const key = await addToCart(product.databaseId, quantity, selectedVariation?.databaseId);
      setInCart(key);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromCart = async () => {
    if (!inCart) return;
    setIsAdding(true);
    try {
      await removeCartItem(inCart);
      const newKey = await isInCart(product.databaseId, selectedVariation?.databaseId);
      setInCart(newKey);
    } finally {
      setIsAdding(false);
    }
  };

  const isVariable = get('type') === 'VARIABLE';
  const price = get<string>('price');
  const regularPrice = get<string>('regularPrice');
  const salePrice = get<string>('salePrice');
  const onSale = salePrice && salePrice !== regularPrice;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back to Shop Link */}
      <Link
        href="/shop"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {product.image ? (
            <Image
              src={product.image.sourceUrl}
              alt={product.image.altText || product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No image available</p>
              </div>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          {/* Product Name */}
          <h1 className="text-3xl font-bold mb-4">{get('name')}</h1>

          {/* Price */}
          <div className="mb-6">
            {onSale ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-red-600">
                  <span dangerouslySetInnerHTML={{ __html: salePrice }} />
                </span>
                <span className="text-xl line-through text-gray-500">
                  <span dangerouslySetInnerHTML={{ __html: regularPrice || '' }} />
                </span>
                <span className="bg-red-600 text-white px-2 py-1 rounded text-sm font-semibold">
                  SALE
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold">
                <span dangerouslySetInnerHTML={{ __html: price }} />
              </span>
            )}
          </div>

          {/* Short Description */}
          {product.shortDescription && (
            <div
              className="prose prose-sm mb-6 text-gray-700"
              dangerouslySetInnerHTML={{ __html: product.shortDescription }}
            />
          )}

          {/* Variable Product Selector */}
          {isVariable && product.variations && (
            <div className="mb-6">
              <label htmlFor="variation-select" className="block text-sm font-semibold mb-2">
                Select Variation
              </label>
              <select
                id="variation-select"
                value={selectedVariation?.databaseId || ''}
                onChange={e => selectVariation(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an option</option>
                {product.variations.map(variation => (
                  <option key={variation.id} value={variation.databaseId}>
                    {variation.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label htmlFor="quantity" className="block text-sm font-semibold mb-2">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))}
              className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Add to Cart / Remove from Cart Button */}
          <div className="mb-8">
            {inCart ? (
              <button
                type="button"
                onClick={handleRemoveFromCart}
                disabled={isAdding}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
              >
                {isAdding ? 'Removing...' : 'Remove from Cart'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || (isVariable && !selectedVariation)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
              >
                {isAdding ? 'Adding...' : 'Add to Cart'}
              </button>
            )}
            {isVariable && !selectedVariation && (
              <p className="text-sm text-red-600 mt-2">Please select a variation</p>
            )}
          </div>

          {/* Full Description */}
          {product.description && (
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
