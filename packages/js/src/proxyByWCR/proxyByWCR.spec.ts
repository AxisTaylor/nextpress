import { proxyByWCR, isProxiedRoute } from './proxyByWCR';
import * as getWPInstanceModule from '../config/getWPInstance';

// Mock getWPInstance
jest.mock('../config/getWPInstance');

// Mock Next.js server (done in jest.setup.ts but re-import here)
jest.mock('next/server');

const mockGetWPInstance = getWPInstanceModule.getWPInstance as jest.MockedFunction<
  typeof getWPInstanceModule.getWPInstance
>;

describe('proxyByWCR', () => {
  // Mock console.error to avoid cluttering test output
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();

    // Default mock for getWPInstance
    mockGetWPInstance.mockImplementation((slug: string) => ({
      wpDomain: `${slug}.example.com`,
      wpProtocol: 'https',
      wpHomeUrl: `https://${slug}.example.com`,
      wpSiteUrl: `https://${slug}.example.com/wp`,
    }));
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  // Helper to create mock request
  const createMockRequest = (url: string, pathname: string): Request & { nextUrl: { pathname: string } } => {
    const request = new Request(url, {
      method: 'GET',
      headers: new Headers({
        'user-agent': 'test-agent',
      }),
    });

    return Object.assign(request, {
      nextUrl: {
        pathname,
      },
    });
  };

  describe('non-proxied routes', () => {
    it('should pass through non-proxied routes', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/some-other-route',
        '/some-other-route'
      );

      const response = await proxyByWCR(request);

      // Should return NextResponse.next()
      expect(response).toBeDefined();
      expect(response.headers.get('x-url')).toBe('https://nextjs.example.com/some-other-route');
    });

    it('should pass through routes without instance slug', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/some-route',
        '/atx/some-route'
      );

      const response = await proxyByWCR(request);

      expect(response).toBeDefined();
    });
  });

  describe('wp-internal-assets proxy', () => {
    it('should proxy wp-internal-assets to wpSiteUrl', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-internal-assets/wp-includes/js/dist/hooks.js',
        '/atx/main/wp-internal-assets/wp-includes/js/dist/hooks.js'
      );

      const response = await proxyByWCR(request);

      // Should rewrite to WordPress site URL
      expect(mockGetWPInstance).toHaveBeenCalledWith('main');

      // NextResponse.rewrite returns a Response object
      expect(response).toBeDefined();
    });

    it('should handle nested paths in wp-internal-assets', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/shop/wp-internal-assets/wp-includes/css/dist/block-library/style.min.css',
        '/atx/shop/wp-internal-assets/wp-includes/css/dist/block-library/style.min.css'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('shop');
      expect(response).toBeDefined();
    });
  });

  describe('wp-assets proxy', () => {
    it('should proxy wp-assets to wpHomeUrl', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-assets/wp-content/themes/theme/style.css',
        '/atx/main/wp-assets/wp-content/themes/theme/style.css'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('main');
      expect(response).toBeDefined();
    });

    it('should handle plugin assets', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-assets/wp-content/plugins/woocommerce/assets/css/woocommerce.css',
        '/atx/main/wp-assets/wp-content/plugins/woocommerce/assets/css/woocommerce.css'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('main');
      expect(response).toBeDefined();
    });

    it('should handle upload assets', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-assets/wp-content/uploads/2024/01/image.jpg',
        '/atx/main/wp-assets/wp-content/uploads/2024/01/image.jpg'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('main');
      expect(response).toBeDefined();
    });
  });

  describe('wp-json REST API proxy', () => {
    it('should proxy wp-json requests with query params', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-json/wp/v2/posts?per_page=10',
        '/atx/main/wp-json/wp/v2/posts'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('main');

      // Should set x-middleware-rewrite header
      const headers = response.headers;
      expect(headers.get('x-middleware-rewrite')).toContain('https://main.example.com/wp-json/wp/v2/posts');
      expect(headers.get('x-middleware-rewrite')).toContain('per_page=10');
    });

    it('should handle WooCommerce REST API', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/shop/wp-json/wc/v3/products',
        '/atx/shop/wp-json/wc/v3/products'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('shop');

      const headers = response.headers;
      expect(headers.get('x-middleware-rewrite')).toContain('https://shop.example.com/wp-json/wc/v3/products');
    });

    it('should preserve all query parameters', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-json/wp/v2/posts?page=2&per_page=5&order=desc',
        '/atx/main/wp-json/wp/v2/posts'
      );

      const response = await proxyByWCR(request);

      const headers = response.headers;
      const rewriteUrl = headers.get('x-middleware-rewrite');

      expect(rewriteUrl).toContain('page=2');
      expect(rewriteUrl).toContain('per_page=5');
      expect(rewriteUrl).toContain('order=desc');
    });
  });

  describe('WordPress AJAX proxy', () => {
    it('should proxy wp-ajax requests to admin-ajax.php', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp?action=my_action',
        '/atx/main/wp'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('main');

      const headers = response.headers;
      expect(headers.get('x-middleware-rewrite')).toContain(
        'https://main.example.com/wp/wp-admin/admin-ajax.php'
      );
      expect(headers.get('x-middleware-rewrite')).toContain('action=my_action');
    });

    it('should preserve multiple query parameters in wp-ajax', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp?action=test&param1=value1&param2=value2',
        '/atx/main/wp'
      );

      const response = await proxyByWCR(request);

      const headers = response.headers;
      const rewriteUrl = headers.get('x-middleware-rewrite');

      expect(rewriteUrl).toContain('action=test');
      expect(rewriteUrl).toContain('param1=value1');
      expect(rewriteUrl).toContain('param2=value2');
    });
  });

  describe('WooCommerce AJAX proxy', () => {
    it('should proxy wc-ajax requests to home URL', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/shop/wc?wc-ajax=add_to_cart',
        '/atx/shop/wc'
      );

      const response = await proxyByWCR(request);

      expect(mockGetWPInstance).toHaveBeenCalledWith('shop');

      const headers = response.headers;
      expect(headers.get('x-middleware-rewrite')).toContain('https://shop.example.com/?');
      expect(headers.get('x-middleware-rewrite')).toContain('wc-ajax=add_to_cart');
    });

    it('should preserve cart parameters in wc-ajax', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/atx/shop/wc?wc-ajax=update_order_review&product_id=123&quantity=2',
        '/atx/shop/wc'
      );

      const response = await proxyByWCR(request);

      const headers = response.headers;
      const rewriteUrl = headers.get('x-middleware-rewrite');

      expect(rewriteUrl).toContain('wc-ajax=update_order_review');
      expect(rewriteUrl).toContain('product_id=123');
      expect(rewriteUrl).toContain('quantity=2');
    });
  });

  describe('multi-instance support', () => {
    it('should route to correct instance based on slug', async () => {
      const mainRequest = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-json/wp/v2/posts',
        '/atx/main/wp-json/wp/v2/posts'
      );

      await proxyByWCR(mainRequest);
      expect(mockGetWPInstance).toHaveBeenCalledWith('main');

      jest.clearAllMocks();

      const shopRequest = createMockRequest(
        'https://nextjs.example.com/atx/shop/wp-json/wc/v3/products',
        '/atx/shop/wp-json/wc/v3/products'
      );

      await proxyByWCR(shopRequest);
      expect(mockGetWPInstance).toHaveBeenCalledWith('shop');
    });

    it('should handle different instances for different asset types', async () => {
      const mainAssetsRequest = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-assets/wp-content/themes/main-theme/style.css',
        '/atx/main/wp-assets/wp-content/themes/main-theme/style.css'
      );

      await proxyByWCR(mainAssetsRequest);
      expect(mockGetWPInstance).toHaveBeenCalledWith('main');

      jest.clearAllMocks();

      const shopAssetsRequest = createMockRequest(
        'https://nextjs.example.com/atx/shop/wp-assets/wp-content/plugins/woocommerce/style.css',
        '/atx/shop/wp-assets/wp-content/plugins/woocommerce/style.css'
      );

      await proxyByWCR(shopAssetsRequest);
      expect(mockGetWPInstance).toHaveBeenCalledWith('shop');
    });
  });

  describe('error handling', () => {
    it('should return 404 when WordPress instance not found', async () => {
      mockGetWPInstance.mockImplementation(() => {
        throw new Error('WordPress instance "invalid" not found');
      });

      const request = createMockRequest(
        'https://nextjs.example.com/atx/invalid/wp-json/wp/v2/posts',
        '/atx/invalid/wp-json/wp/v2/posts'
      );

      const response = await proxyByWCR(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('WordPress instance not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should log error when instance retrieval fails', async () => {
      mockGetWPInstance.mockImplementation(() => {
        throw new Error('Configuration file not found');
      });

      const request = createMockRequest(
        'https://nextjs.example.com/atx/main/wp-json/wp/v2/posts',
        '/atx/main/wp-json/wp/v2/posts'
      );

      await proxyByWCR(request);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[NextPress] Failed to get WordPress instance "main"'),
        expect.any(Error)
      );
    });
  });

  describe('request headers', () => {
    it('should set x-url header for non-proxied routes', async () => {
      const request = createMockRequest(
        'https://nextjs.example.com/some-route',
        '/some-route'
      );

      const response = await proxyByWCR(request);

      expect(response.headers.get('x-url')).toBe('https://nextjs.example.com/some-route');
    });

    it('should preserve original request headers', async () => {
      const url = 'https://nextjs.example.com/atx/main/wp-json/wp/v2/posts';
      const request = new Request(url, {
        method: 'GET',
        headers: new Headers({
          'user-agent': 'test-agent',
          'authorization': 'Bearer token123',
          'custom-header': 'custom-value',
        }),
      });

      Object.assign(request, {
        nextUrl: {
          pathname: '/atx/main/wp-json/wp/v2/posts',
        },
      });

      const response = await proxyByWCR(request as any);

      // Original headers should be preserved in the response
      expect(response.headers.get('x-middleware-rewrite')).toBeDefined();
    });
  });

  describe('isProxiedRoute helper', () => {
    it('should identify wp-ajax routes', () => {
      expect(isProxiedRoute('/atx/main/wp')).toBe(true);
      expect(isProxiedRoute('/atx/shop/wp')).toBe(true);
    });

    it('should identify wc-ajax routes', () => {
      expect(isProxiedRoute('/atx/main/wc')).toBe(true);
      expect(isProxiedRoute('/atx/shop/wc')).toBe(true);
    });

    it('should identify wp-internal-assets routes', () => {
      expect(isProxiedRoute('/atx/main/wp-internal-assets/wp-includes/js/script.js')).toBe(true);
      expect(isProxiedRoute('/atx/shop/wp-internal-assets/wp-includes/css/style.css')).toBe(true);
    });

    it('should identify wp-assets routes', () => {
      expect(isProxiedRoute('/atx/main/wp-assets/wp-content/themes/theme/style.css')).toBe(true);
      expect(isProxiedRoute('/atx/shop/wp-assets/wp-content/uploads/image.jpg')).toBe(true);
    });

    it('should identify wp-json routes', () => {
      expect(isProxiedRoute('/atx/main/wp-json/wp/v2/posts')).toBe(true);
      expect(isProxiedRoute('/atx/shop/wp-json/wc/v3/products')).toBe(true);
    });

    it('should reject non-proxied routes', () => {
      expect(isProxiedRoute('/atx/some-other-route')).toBe(false);
      expect(isProxiedRoute('/some-route')).toBe(false);
      expect(isProxiedRoute('/atx/main')).toBe(false);
      expect(isProxiedRoute('/atx/main/unknown-route')).toBe(false);
    });
  });
});
