import { NextRequest, NextResponse } from 'next/server';
import { fetchProduct } from '@/lib/utils';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * GET /api/product/[slug]
 *
 * Returns a single product by slug from WooCommerce GraphQL
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      {
        success: false,
        error: 'Product slug is required',
      },
      { status: 400 }
    );
  }

  try {
    const product = await fetchProduct(slug);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(`[GET /api/product/${slug}] Error fetching product:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
      },
      { status: 500 }
    );
  }
}
