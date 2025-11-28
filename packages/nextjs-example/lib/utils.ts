import 'server-only';
import { cookies } from 'next/headers';
import { EnqueuedScript, EnqueuedStylesheet } from "@axistaylor/nextpress";

/**
 * Fetch content by URI with Cart-Token
 */
export async function fetchContentByUri(uri: string): Promise<string> {
  const cookieStore = await cookies();
  const cartToken = cookieStore.get('cartToken')?.value;
  const authToken = cookieStore.get('authToken')?.value;
  const headers: Record<string, string> = {'Content-Type': 'application/json'};

  if (cartToken) {
    headers['Cart-Token'] = cartToken;
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `query ($uri: String!) {
        nodeByUri(uri: $uri) {
          ... on Page {
            content
          }
          ... on Post {
            content
          }
        }
      }`,
      variables: { uri },
    }),
    cache: 'no-store',
  });

  // Handle non-JSON responses
  if (!response.ok) {
    console.error(`[fetchContentByUri] GraphQL error for ${uri}:`, response.status);
    return '';
  }

  let data;
  try {
    const jsonResponse = await response.json();
    data = jsonResponse.data;
  } catch (error) {
    console.error(`[fetchContentByUri] Failed to parse JSON for ${uri}:`, error);
    return '';
  }

  const node = data?.nodeByUri;

  if (!node) {
    return '';
  }

  const content = node.content;

  return content;
}

export async function fetchStylesAndScriptsByUri(uri: string): Promise<{ scripts: EnqueuedScript[], stylesheets: EnqueuedStylesheet[] }> {
  const cookieStore = await cookies();
  const cartToken = cookieStore.get('cartToken')?.value;
  const authToken = cookieStore.get('authToken')?.value;
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (cartToken) {
    headers['Cart-Token'] = cartToken;
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `query ($uri: String!) {
        assetsByUri(uri: $uri) {
          id
          uri
          enqueuedStylesheets(first: 500) {
            nodes {
              handle
              src
              version
              after
              before
              dependencies {
                handle
              }
            }
          }
          enqueuedScripts(first: 500) {
            nodes {
              handle
              src
              strategy
              version
              after
              group
              location
              before
              extraData
              dependencies {
                handle
              }
            }
          }
        }
      }`,
      variables: { uri }
    }),
    cache: 'no-store',
  });

  const { data } = await response.json();
  const assets = data?.assetsByUri;

  if (!assets) {
    return {
      scripts: [],
      stylesheets: [],
    };
  }

  const scripts = assets.enqueuedScripts.nodes;
  const stylesheets = assets.enqueuedStylesheets.nodes;

  return {
    scripts,
    stylesheets,
  }
}

export interface ProductImage {
  sourceUrl: string;
  altText: string;
  srcSet: string;
  sizes: string;
}

export interface Product {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  type: string;
  image: ProductImage | null;
  price?: string;
  salePrice?: string;
  regularPrice?: string;
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query: `query {
        products(first: 10) {
          edges {
            cursor
            node {
              id
              databaseId
              name
              slug
              type
              image {
                sourceUrl(size: WOOCOMMERCE_THUMBNAIL)
                altText
                srcSet(size:WOOCOMMERCE_THUMBNAIL)
                sizes(size:WOOCOMMERCE_THUMBNAIL)
              }
              ... on ProductWithPricing {
                price
                salePrice
                regularPrice
              }
            }
          }
        }
      }`,
    }),
    cache: 'no-store',
  });

  const { data } = await response.json();
  const products = data?.products?.edges?.map((edge: any) => edge.node) || [];

  return products;
}

export async function fetchProduct(slug: string) {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query: `query ($slug: ID!) {
        product(id: $slug, idType: SLUG) {
          id
          databaseId
          type
          name
          slug
          description
          shortDescription
          ... on ProductWithPricing {
            price
            regularPrice
            salePrice
          }
          ... on ProductWithVariations {
            variations {
              nodes {
                id
                databaseId
                name
                price
                regularPrice
                salePrice
              }
            }
          }
        }
      }`,
      variables: { slug },
    }),
    cache: 'no-store',
  });

  const { data } = await response.json();
  const product = data?.product;

  if (!product) {
    return null;
  }

  return product;
}

export interface Order {
  id: string;
  databaseId: number;
  orderNumber: string;
  status: string;
  date: string;
  total: string;
  subtotal: string;
  totalTax: string;
  shippingTotal: string;
  discountTotal: string;
  paymentMethod: string;
  paymentMethodTitle: string;
  customerNote: string;
  billing: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  lineItems: {
    nodes: Array<{
      productId: number;
      variationId: number | null;
      quantity: number;
      total: string;
      subtotal: string;
      product: {
        node: {
          id: string;
          databaseId: number;
          name: string;
          slug: string;
          image: {
            sourceUrl: string;
            altText: string;
          } | null;
        };
      } | null;
      variation: {
        node: {
          id: string;
          databaseId: number;
          name: string;
          image: {
            sourceUrl: string;
            altText: string;
          } | null;
        };
      } | null;
    }>;
  };
  shippingLines: {
    nodes: Array<{
      methodTitle: string;
      total: string;
    }>;
  };
  feeLines: {
    nodes: Array<{
      name: string;
      total: string;
    }>;
  };
  taxLines: {
    nodes: Array<{
      label: string;
      taxTotal: string;
    }>;
  };
}

export async function fetchOrder(orderId: string): Promise<Order | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${process.env.CHECKOUT_KEY}`,
  };

  try {
    const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `query GetOrder($id: ID!) {
          order(id: $id idType: DATABASE_ID) {
            id
            databaseId
            orderNumber
            status
            date
            total
            subtotal
            totalTax
            shippingTotal
            discountTotal
            paymentMethod
            paymentMethodTitle
            customerNote
            billing {
              firstName
              lastName
              company
              address1
              address2
              city
              state
              postcode
              country
              email
              phone
            }
            shipping {
              firstName
              lastName
              company
              address1
              address2
              city
              state
              postcode
              country
            }
            lineItems {
              nodes {
                productId
                variationId
                quantity
                total
                subtotal
                product {
                  node {
                    id
                    databaseId
                    name
                    slug
                    image {
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
                    image {
                      sourceUrl(size: WOOCOMMERCE_THUMBNAIL)
                      altText
                    }
                  }
                }
              }
            }
            shippingLines {
              nodes {
                methodTitle
                total
              }
            }
            feeLines {
              nodes {
                name
                total
              }
            }
            taxLines {
              nodes {
                label
                taxTotal
              }
            }
          }
        }`,
        variables: {
          id: orderId,
        },
      }),
      cache: 'no-store',
    });

    const { data, errors } = await response.json();

    if (errors) {
      console.error('[fetchOrder] GraphQL errors:', errors);
      return null;
    }

    return data?.order || null;
  } catch (error) {
    console.error('[fetchOrder] Fetch error:', error);
    return null;
  }
}
