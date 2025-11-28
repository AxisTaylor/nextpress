import { NextRequest, NextResponse } from 'next/server';
import { proxyByWCR } from 'nextpress/proxyByWCR';
import { getTokens } from '@/lib/session';

export const middleware = async (request: NextRequest) => {
  request.headers.set('x-url', request.url);
  const frontendDomain: string|undefined = process.env.wcr_frontend_url;
  if (frontendDomain) {
    request.headers.set('x-uri', request.url.replace(frontendDomain, ''));
  }
  const response = await proxyByWCR(request);
  
  const headers = new Headers(response.headers);
  const { sessionToken, authToken } = await getTokens(response);
  headers.set('woocommerce-session', `Session ${sessionToken}`);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const nextResponse = new NextResponse(null, { ...response, headers });

  // console.log('nextResponse', nextResponse.headers);
  return nextResponse;
}
// Example matchers
//
// export const config = {
//   matcher: [
//     '/api/wp',
//     '/api/wc',
//     '/api/wp-internal-assets/:path*',
//     '/api/wp-assets/:path*',
//     '/api/wp-json/:path*',
//   ],
// }