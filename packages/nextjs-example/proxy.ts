import { NextResponse, NextRequest } from "next/server";
import { proxyByWCR, isProxiedRoute } from '@axistaylor/nextpress/proxyByWCR';

/**
 * Middleware to proxy WordPress API requests and manage Cart-Token
 *
 * Cart-Token Flow:
 * 1. Read existing Cart-Token from request cookies
 * 2. Add Cart-Token to proxied request headers (if exists)
 * 3. Proxy request to WordPress backend
 * 4. Extract updated Cart-Token from WordPress response
 * 5. Set updated Cart-Token in response cookies
 */
export const proxy = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // Check if this is a WordPress proxy route
  if (isProxiedRoute(pathname)) {
    // Get existing Cart-Token from cookies
    const cartToken = request.cookies.get('cartToken')?.value;
    const authToken = request.cookies.get('authToken')?.value;

    // Add Cart-Token to request headers if present
    if (cartToken) {
      request.headers.set('Cart-Token', cartToken);
    }
    if (authToken) {
      request.headers.set('Authorization', `Bearer ${authToken}`);
    }

    // Proxy request to WordPress backend
    const response = await proxyByWCR(request);

    // Check if WordPress returned an updated Cart-Token
    const updatedCartToken = response.headers.get('Cart-Token');

    if (updatedCartToken) {
      // Create a new Response with the proxied response body and headers
      const nextResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Set the updated Cart-Token cookie
      nextResponse.cookies.set({
        name: 'cartToken',
        value: updatedCartToken,
        path: '/', // CRITICAL: Ensure cookie is sent with all requests
        maxAge: 30 * 24 * 60 * 60, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      });

      return nextResponse;
    }

    // Return the proxied response even if there's no Cart-Token
    return response;
  }

  // For non-API routes (WordPress pages), set x-uri header and continue
  const headers = new Headers(request.headers);
  headers.set('x-uri', pathname);
  return NextResponse.next({
    request: {
      headers,
    },
  });
}

// REQUIRED: Middleware matcher configuration
// Matches WordPress API routes for all instances (/:instance/wp, /:instance/wc, etc.)
// AND WordPress pages to set x-uri header for asset fetching
// Without this, Next.js will not invoke the proxy for WordPress API routes
export const config = {
  matcher: [
    // API routes for proxying to WordPress
    '/atx/:instance/proxiee',
    '/atx/:instance/wp',
    '/atx/:instance/wc',
    '/atx/:instance/wp-internal-assets/:path*',
    '/atx/:instance/wp-assets/:path*',
    '/atx/:instance/wp-json/:path*',
    // WordPress pages that need x-uri header set
    // Exclude static files, Next.js internals, and API routes
    '/((?!_next|api|favicon.ico|sw.js|.*\\.).*)',
  ],
}