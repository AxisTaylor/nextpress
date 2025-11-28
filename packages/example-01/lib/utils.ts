import { cookies } from 'next/headers';
import { EnqueuedScript, EnqueuedStylesheet } from "nextpress";

export async function fetchContentByUri(uri: string): Promise<string> {
  const sessionToken = cookies().get('sessionToken')?.value;
  const authToken = cookies().get('authToken')?.value;
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (sessionToken) {
    headers['woocommerce-session'] = `Session ${sessionToken}`;
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

  const { data } = await response.json();
  const node = data?.nodeByUri;

  if (!node) {
    return '';
  }

  const content = node.content;

  return content;
}

export async function fetchStylesAndScriptsByUri(uri: string): Promise<{ scripts: EnqueuedScript[], stylesheets: EnqueuedStylesheet[] }> {
  const sessionToken = cookies().get('sessionToken')?.value;
  const authToken = cookies().get('authToken')?.value;
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (sessionToken) {
    headers['woocommerce-session'] = `Session ${sessionToken}`;
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
  const node = data?.nodeByUri;

  if (!node) {
    return {
      scripts: [],
      stylesheets: [],
    };
  }

  const scripts = node.enqueuedScripts.nodes;
  const stylesheets = node.enqueuedStylesheets.nodes;

  return {
    scripts,
    stylesheets,
  }
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
