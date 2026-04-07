import 'server-only';
import { EnqueuedScript, EnqueuedStylesheet, GlobalStyles } from "@axistaylor/nextpress";
import { cookies } from 'next/headers';

/**
 * Fetch content by URI.
 * Public WordPress content is the same for all users — no session cookies needed.
 * Cart/checkout content is WC Blocks markup; actual user data is loaded client-side.
 * Caching controlled at the route level via `revalidate` / `dynamic` exports.
 */
export async function fetchContentByUri(uri: string): Promise<string> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  });

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

  return node.content;
}

/**
 * Cacheable query — fetches asset structure (handle, src, version, deps, etc.)
 * without nonce-sensitive inline data. Inherits route-level revalidation.
 */
async function fetchAssetStructureByUri(uri: string): Promise<{
  scripts: Omit<EnqueuedScript, 'before' | 'after'>[];
  stylesheets: Omit<EnqueuedStylesheet, 'before' | 'after'>[];
}> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
            }
          }
          enqueuedScripts(first: 500) {
            nodes {
              handle
              src
              strategy
              version
              group
              location
              extraData
              dependencies {
                handle
              }
            }
          }
        }
      }`,
      variables: { uri },
    }),
  });

  const { data } = await response.json();
  const assets = data?.assetsByUri;

  if (!assets) {
    return { scripts: [], stylesheets: [] };
  }

  return {
    scripts: assets.enqueuedScripts.nodes,
    stylesheets: assets.enqueuedStylesheets.nodes,
  };
}

/**
 * Dynamic query — fetches inline script/stylesheet data (before/after).
 * These contain nonce-sensitive data (e.g., wc-settings Store API nonces)
 * and must always be fresh.
 */
async function fetchInlineScriptDataByUri(uri: string): Promise<{
  scripts: Array<{ handle: string; before: EnqueuedScript['before']; after: EnqueuedScript['after'] }>;
  stylesheets: Array<{ handle: string; before: EnqueuedStylesheet['before']; after: EnqueuedStylesheet['after'] }>;
}> {
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
          enqueuedStylesheets(first: 500) {
            nodes {
              handle
              before
              after
            }
          }
          enqueuedScripts(first: 500) {
            nodes {
              handle
              before
              after
            }
          }
        }
      }`,
      variables: { uri },
    }),
    cache: 'no-store',
  });

  const { data } = await response.json();
  const assets = data?.assetsByUri;

  if (!assets) {
    return { scripts: [], stylesheets: [] };
  }

  return {
    scripts: assets.enqueuedScripts.nodes,
    stylesheets: assets.enqueuedStylesheets.nodes,
  };
}

/**
 * Fetch styles and scripts by URI with two-tier caching.
 * Asset structure (handles, src, versions) is cacheable via route-level revalidation.
 * Inline script data (before/after with nonces) is always fetched fresh.
 * Results are merged by handle before returning.
 */
export async function fetchStylesAndScriptsByUri(uri: string): Promise<{
  scripts: EnqueuedScript[];
  stylesheets: EnqueuedStylesheet[];
}> {
  const [structure, inlineData] = await Promise.all([
    fetchAssetStructureByUri(uri),
    fetchInlineScriptDataByUri(uri),
  ]);

  // Merge inline data onto asset structure by handle
  const scriptInlineMap = new Map(
    inlineData.scripts.map(s => [s.handle, { before: s.before, after: s.after }])
  );
  const stylesheetInlineMap = new Map(
    inlineData.stylesheets.map(s => [s.handle, { before: s.before, after: s.after }])
  );

  const scripts: EnqueuedScript[] = structure.scripts.map(script => ({
    ...script,
    ...(scriptInlineMap.get(script.handle as string) || { before: null, after: null }),
  }));

  const stylesheets: EnqueuedStylesheet[] = structure.stylesheets.map(stylesheet => ({
    ...stylesheet,
    ...(stylesheetInlineMap.get(stylesheet.handle as string) || { before: null, after: null }),
  }));

  return { scripts, stylesheets };
}

/**
 * Fetch global WordPress styles (theme.json stylesheet, custom CSS, font faces).
 * These are the same for all pages and can be cached at the route level.
 */
export async function fetchGlobalStyles(): Promise<GlobalStyles> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query {
        globalStyles {
          stylesheet
          customCss
          renderedFontFaces
        }
      }`,
    }),
  });

  const { data } = await response.json();

  return data?.globalStyles || {};
}

/**
 * Fetch all WordPress page slugs for static generation.
 * Excludes WooCommerce pages (cart, checkout) that must be dynamic.
 */
const DYNAMIC_PAGE_SLUGS = ['cart', 'checkout'];

export async function fetchPageSlugs(): Promise<string[][]> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query {
        pages(first: 100) {
          nodes {
            uri
          }
        }
      }`,
    }),
  });

  const { data } = await response.json();
  const pages: Array<{ uri: string }> = data?.pages?.nodes || [];

  return pages
    .map(page => page.uri.replace(/^\/|\/$/g, '')) // strip leading/trailing slashes
    .filter(slug => slug && !DYNAMIC_PAGE_SLUGS.includes(slug))
    .map(slug => slug.split('/'));
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
    headers: { 'Content-Type': 'application/json' },
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
  });

  const { data } = await response.json();
  const products = data?.products?.edges?.map((edge: { node: Product }) => edge.node) || [];

  return products;
}

export async function fetchProduct(slug: string) {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
