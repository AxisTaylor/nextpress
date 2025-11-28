/**
 * Client-side cart functions that use the API routes for proper session management
 */

type CartItem = {
  key: string;
  product: {
    node: {
      id: string;
      databaseId: number;
    };
  };
  variation?: {
    node: {
      id: string;
      databaseId: number;
    };
  };
};

/**
 * Check if a product (with optional variation) is in the cart
 * Returns the cart item key if found, false otherwise
 */
export async function isInCart(productId: number, variationId?: number): Promise<string | false> {
  try {
    const response = await fetch('/api/cart', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[isInCart] API error:', response.statusText);
      return false;
    }

    const { cart } = await response.json();

    if (!cart?.contents?.nodes) {
      return false;
    }

    const cartItems: CartItem[] = cart.contents.nodes;
    const cartItem = cartItems?.find((item: CartItem) => {
      if (variationId) {
        return item.product.node.databaseId === productId && item.variation?.node.databaseId === variationId;
      }
      return item.product.node.databaseId === productId;
    });

    return cartItem?.key || false;
  } catch (error) {
    console.error('[isInCart] Fetch error:', error);
    return false;
  }
}

/**
 * Add a product to cart
 * Returns the cart item key if successful, false otherwise
 */
export async function addToCart(
  productId?: number,
  quantity?: number,
  variationId?: number,
  variation?: Record<string, string>,
  extraData?: Record<string, string>
): Promise<string | false> {
  try {
    const response = await fetch('/api/update-cart', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add',
        productId,
        quantity: quantity || 1,
        variationId,
        variation,
        extraData,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[addToCart] API error:', response.statusText);
      return false;
    }

    const { success, data, error } = await response.json();

    if (!success || error) {
      console.error('[addToCart] Mutation error:', error);
      return false;
    }

    const cartItem = data?.addToCart?.cartItem;

    if (!cartItem) {
      return false;
    }

    return cartItem.key;
  } catch (error) {
    console.error('[addToCart] Fetch error:', error);
    return false;
  }
}

/**
 * Remove an item from cart by its key
 * Returns true if successful
 */
export async function removeCartItem(key: string): Promise<boolean> {
  try {
    const response = await fetch('/api/update-cart', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'remove',
        key,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[removeCartItem] API error:', response.statusText);
      return false;
    }

    const { success, data, error } = await response.json();

    if (!success || error) {
      console.error('[removeCartItem] Mutation error:', error);
      return false;
    }

    return data?.removeItemsFromCart?.cartItems?.length > 0 || false;
  } catch (error) {
    console.error('[removeCartItem] Fetch error:', error);
    return false;
  }
}

/**
 * Update cart item quantity
 * Returns true if successful
 */
export async function updateCartItem(key: string, quantity: number): Promise<boolean> {
  try {
    const response = await fetch('/api/update-cart', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        key,
        quantity,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[updateCartItem] API error:', response.statusText);
      return false;
    }

    const { success, data, error } = await response.json();

    if (!success || error) {
      console.error('[updateCartItem] Mutation error:', error);
      return false;
    }

    return data?.updateItemQuantities?.items?.length > 0 || false;
  } catch (error) {
    console.error('[updateCartItem] Fetch error:', error);
    return false;
  }
}
