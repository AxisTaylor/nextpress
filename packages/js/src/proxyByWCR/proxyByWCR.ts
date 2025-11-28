import { NextResponse } from 'next/server';
import { getWPInstance } from '../config/getWPInstance';

/**
 * Extracts the WordPress instance slug from the URL path
 * Expects paths like: /atx/[slug]/wc, /atx/[slug]/wp, /atx/[slug], etc.
 */
function extractSlugFromPath(pathname: string): string | null {
  // Match /atx/[slug]/ or /atx/[slug] (exact)
  const match = pathname.match(/^\/atx\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * Encodes a string using XOR cipher with salt
 */
function encodeWithSalt(data: string, salt: string): string {
  const textBytes = Buffer.from(data, 'utf8');
  const saltBytes = Buffer.from(salt, 'utf8');
  const encoded = Buffer.alloc(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    encoded[i] = textBytes[i] ^ saltBytes[i % saltBytes.length];
  }

  return encoded.toString('base64');
}

/**
 * Checks if a pathname matches WordPress proxy route patterns
 * @param pathname - The request pathname to check
 * @returns true if the path should be proxied to WordPress
 */
export function isProxiedRoute(pathname: string): boolean {
  return !!(
    pathname.match(/^\/atx\/[^/]+\/proxiee$/) ||
    pathname.match(/^\/atx\/[^/]+\/wp-internal-assets\//) ||
    pathname.match(/^\/atx\/[^/]+\/wp-assets\//) ||
    pathname.match(/^\/atx\/[^/]+\/wp-json\//) ||
    pathname.match(/^\/atx\/[^/]+\/wp$/) ||
    pathname.match(/^\/atx\/[^/]+\/wc$/)
  );
}

export async function proxyByWCR(request: Request & { nextUrl: { pathname: string } }) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-url', request.url);
  const nextPath = request.nextUrl.pathname;

  // Check if this is a WordPress proxy route pattern
  if (!isProxiedRoute(nextPath)) {
    // Not a WordPress proxy route, pass through to application routes
    return NextResponse.next({
      request: {
        ...request,
        headers: requestHeaders,
      },
    });
  }

  // Extract slug from path
  const slug = extractSlugFromPath(nextPath);
  if (!slug) {
    // Not a proxied route, pass through
    return NextResponse.next({
      request: {
        ...request,
        headers: requestHeaders,
      },
    });
  }

  // Get WordPress instance config
  let instance;
  try {
    instance = getWPInstance(slug);
  } catch (error) {
    console.error(`[NextPress] Failed to get WordPress instance "${slug}":`, error);
    return new NextResponse('WordPress instance not found', { status: 404 });
  }

  // Handler for WordPress backend URL retrieval (obscured endpoint)
  // Used by client components to determine if script URLs are external or WordPress assets
  const backendUrlPattern = new RegExp(`^/atx/${slug}/proxiee$`);
  if (backendUrlPattern.test(nextPath) && request.method === 'POST') {
    // Get salt from environment (set by withWCR)
    const salt = process.env.NEXTPRESS_SALT || 'nextpress-default-salt';
    // Encode using XOR cipher with salt
    const encoded = encodeWithSalt(instance.wpHomeUrl, salt);
    return NextResponse.json({ d: encoded });
  }

  //Proxy handler for WP internal assets e.g. (.js, .css, .png, etc.) from wp-includes
  if (nextPath.match(/^\/atx\/[^/]+\/wp-internal-assets\//)) {
    const scriptUrl = nextPath.replace(
      /^\/atx\/[^/]+\/wp-internal-assets\/(.*)/,
      `${instance.wpSiteUrl}/$1`
    );

    return NextResponse.rewrite(scriptUrl);
  }

  // Proxy handler for WP assets from wp-content
  if (nextPath.match(/^\/atx\/[^/]+\/wp-assets\//)) {
    const scriptUrl = nextPath.replace(
      /^\/atx\/[^/]+\/wp-assets\/(.*)/,
      `${instance.wpHomeUrl}/$1`
    );

    return NextResponse.rewrite(scriptUrl);
  }

  // Proxy handler for WP REST API requests.
  if (nextPath.match(/^\/atx\/[^/]+\/wp-json\//)) {
    const url = new URL(request.url);
    const params = url.searchParams;
    const backendRoute = nextPath.replace(
      /^\/atx\/[^/]+\/wp-json\/(.*)/,
      `${instance.wpHomeUrl}/wp-json/$1?${params.toString()}`
    );

    // Actually fetch from WordPress backend and proxy the response
    const backendResponse = await fetch(backendRoute, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      ...(request.method !== 'GET' && request.method !== 'HEAD' && request.body ? { duplex: 'half' } : {}),
    } as RequestInit);

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  }

  // Proxy handler for WP Ajax API requests.
  const wpAjaxPattern = new RegExp(`^/atx/${slug}/wp$`);
  const wcAjaxPattern = new RegExp(`^/atx/${slug}/wc$`);

  if (wpAjaxPattern.test(nextPath) || wcAjaxPattern.test(nextPath)) {
    const url = new URL(request.url);
    const params = url.searchParams;
    let backendRoute: string;

    if (wcAjaxPattern.test(nextPath)) {
      backendRoute = `${instance.wpHomeUrl}/?${params.toString()}`;
    } else {
      backendRoute = `${instance.wpSiteUrl}/wp-admin/admin-ajax.php?${params.toString()}`;
    }

    // Actually fetch from WordPress backend and proxy the response
    const backendResponse = await fetch(backendRoute, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      ...(request.method !== 'GET' && request.method !== 'HEAD' && request.body ? { duplex: 'half' } : {}),
    } as RequestInit);

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  }

  return NextResponse.next({
    request: {
      ...request,
      headers: requestHeaders,
    },
  });
}

/**
 * Matcher configuration for Next.js middleware
 * Use this in your middleware.ts config.matcher
 */
export const proxyMatcher = [
  '/atx/:slug/proxiee',
  '/atx/:slug/wp',
  '/atx/:slug/wc',
  '/atx/:slug/wp-internal-assets/:path*',
  '/atx/:slug/wp-assets/:path*',
  '/atx/:slug/wp-json/:path*',
];
