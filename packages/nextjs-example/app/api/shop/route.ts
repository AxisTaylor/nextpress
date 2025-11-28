import { NextRequest, NextResponse } from 'next/server';
import { fetchProducts } from '@/lib/utils';

/**
 * GET /api/shop
 *
 * Returns the list of products from WooCommerce GraphQL
 */
export async function GET(request: NextRequest) {
  try {
    const products = await fetchProducts();

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error('[GET /api/shop] Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}
