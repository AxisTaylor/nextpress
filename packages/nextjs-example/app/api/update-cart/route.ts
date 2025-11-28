import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type UpdateCartAction = 'add' | 'remove' | 'update';

interface UpdateCartRequest {
  action: UpdateCartAction;
  productId?: number;
  quantity?: number;
  variationId?: number;
  variation?: Record<string, string>;
  extraData?: Record<string, string>;
  key?: string; // For remove/update actions
}

/**
 * POST /api/update-cart
 *
 * Executes cart mutations (add, remove, update) and manages WooCommerce Cart-Token.
 *
 * Cart-Token Flow:
 * 1. Check for existing Cart-Token in cookies
 * 2. Send Cart-Token in GraphQL request header (if exists)
 * 3. Extract updated Cart-Token from GraphQL response header
 * 4. Save/update Cart-Token in cookies
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const body: UpdateCartRequest = await request.json();
  const { action, productId, quantity, variationId, variation, extraData, key } = body;

  // Check for existing Cart-Token
  let cartToken = cookieStore.get('cartToken')?.value;
  const authToken = cookieStore.get('authToken')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add existing Cart-Token to request header if present
  if (cartToken) {
    headers['Cart-Token'] = cartToken;
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let query = '';
  let variables: Record<string, unknown> = {};

  // Build mutation based on action
  switch (action) {
    case 'add':
      query = `mutation AddToCart($input: AddToCartInput!) {
        addToCart(input: $input) {
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
                  }
                }
              }
            }
            subtotal
            subtotalTax
            shippingTax
            shippingTotal
            total
            totalTax
            discountTotal
          }
          cartItem {
            key
            quantity
            product {
              node {
                id
                databaseId
              }
            }
          }
        }
      }`;
      variables = {
        input: {
          productId,
          quantity: quantity || 1,
          variationId,
          variation,
          extraData,
        },
      };
      break;

    case 'remove':
      if (!key) {
        return NextResponse.json({ error: 'Cart item key is required for remove action' }, { status: 400 });
      }
      query = `mutation RemoveItemsFromCart($input: RemoveItemsFromCartInput!) {
        removeItemsFromCart(input: $input) {
          cart {
            contents(first: 100) {
              itemCount
              nodes {
                key
                quantity
                total
                subtotal
              }
            }
            subtotal
            total
          }
          cartItems {
            key
          }
        }
      }`;
      variables = {
        input: {
          keys: [key],
        },
      };
      break;

    case 'update':
      if (!key) {
        return NextResponse.json({ error: 'Cart item key is required for update action' }, { status: 400 });
      }
      query = `mutation UpdateCartItemQuantities($input: UpdateItemQuantitiesInput!) {
        updateItemQuantities(input: $input) {
          cart {
            contents(first: 100) {
              itemCount
              nodes {
                key
                quantity
                total
                subtotal
              }
            }
            subtotal
            total
          }
          items {
            key
            quantity
          }
        }
      }`;
      variables = {
        input: {
          items: [
            {
              key,
              quantity: quantity || 1,
            },
          ],
        },
      };
      break;

    default:
      return NextResponse.json({ error: 'Invalid action. Must be add, remove, or update' }, { status: 400 });
  }

  try {
    const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: 'no-store',
    });

    // Extract updated Cart-Token from response header
    const updatedCartToken = response.headers.get('Cart-Token');

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[POST /api/update-cart] HTTP error ${response.status}:`, errorText);
      return NextResponse.json({ error: `GraphQL endpoint returned ${response.status}` }, { status: 500 });
    }

    const { data, errors } = await response.json();

    if (errors) {
      console.error(`[POST /api/update-cart] GraphQL errors (${action}):`, JSON.stringify(errors, null, 2));
      console.error(`[POST /api/update-cart] Variables sent:`, JSON.stringify(variables, null, 2));
      console.error(`[POST /api/update-cart] Cart-Token:`, cartToken ? cartToken.substring(0, 20) + '...' : 'none');
      return NextResponse.json({ error: `Failed to ${action} cart item`, details: errors }, { status: 500 });
    }

    // Save or update Cart-Token in cookies
    // IMPORTANT: In API route handlers, use cookies() function to set cookies
    if (updatedCartToken) {
      cookieStore.set(
        'cartToken',
        updatedCartToken,
        {
          path: '/', // CRITICAL: Ensure cookie is sent with all requests
          maxAge: 30 * 24 * 60 * 60, // 30 days
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax',
        }
      );
    }

    // Return standard Response with JSON data
    return new NextResponse(JSON.stringify({
      success: true,
      data,
    }), {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': cookieStore.toString(),
      }),
    });

    
  } catch (error) {
    console.error(`[POST /api/update-cart] Fetch error (${action}):`, error);
    return NextResponse.json({ error: `Failed to ${action} cart item` }, { status: 500 });
  }
}
