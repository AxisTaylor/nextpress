import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/cart
 *
 * Fetches the current user's cart using WooCommerce Cart-Token.
 * Returns { cart: null } if no Cart-Token exists (no cart started yet).
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const cartToken = cookieStore.get('cartToken')?.value;
  const authToken = cookieStore.get('authToken')?.value;

  // If no Cart-Token, return null cart (session not started)
  if (!cartToken) {
    return NextResponse.json({ cart: null });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cart-Token': cartToken,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `query GetCart {
          cart {
            contents(first: 100) {
              itemCount
              nodes {
                key
                quantity
                total
                subtotal
                subtotalTax
                product {
                  node {
                    id
                    databaseId
                    name
                    slug
                    type
                    image {
                      id
                      sourceUrl(size: WOOCOMMERCE_THUMBNAIL)
                      altText
                    }
                  }
                }
                variation {
                  node {
                    id
                    databaseId
                    name
                    slug
                    price
                    regularPrice
                    image {
                      id
                      sourceUrl(size: WOOCOMMERCE_THUMBNAIL)
                      altText
                    }
                  }
                }
              }
            }
            appliedCoupons {
              code
              discountAmount
              discountTax
            }
            needsShippingAddress
            subtotal
            subtotalTax
            shippingTax
            shippingTotal
            total
            totalTax
            feeTax
            feeTotal
            discountTax
            discountTotal
          }
        }`,
      }),
      cache: 'no-store',
    });

    const { data, errors } = await response.json();

    if (errors) {
      console.error('[GET /api/cart] GraphQL errors:', errors);
      return NextResponse.json({ error: 'Failed to fetch cart', details: errors }, { status: 500 });
    }

    return NextResponse.json({ cart: data?.cart || null });
  } catch (error) {
    console.error('[GET /api/cart] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}
