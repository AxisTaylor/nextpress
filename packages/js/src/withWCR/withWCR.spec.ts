import { withWCR } from './withWCR';
import { NextConfig } from 'next';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('withWCR', () => {
  // Mock console.log to avoid cluttering test output
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();

    // Setup path.join mock to return predictable paths
    mockPath.join.mockImplementation((...segments) => segments.join('/'));

    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue('/test/project');

    // Default fs mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('single instance configuration (legacy)', () => {
    it('should accept single WordPress instance configuration', async () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        wpDomain: 'wordpress.example.com',
        wpProtocol: 'https',
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      expect(result).toBeDefined();
      expect(result.env).toBeDefined();
      expect(result.env?.wcr_frontend_url).toBe('https://nextjs.example.com');
    });

    it('should normalize single instance with default wpHomeUrl and wpSiteUrl', async () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        wpDomain: 'wordpress.example.com',
        wpProtocol: 'https',
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      withWCR(nextConfig, wpConfig, options);

      // Check that config file would be written with normalized URLs
      const writtenConfig = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('wp-instances.js')
      )?.[1];

      if (writtenConfig) {
        expect(writtenConfig).toContain('https://wordpress.example.com');
      }
    });

    it('should use provided wpHomeUrl and wpSiteUrl if specified', async () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        wpDomain: 'wordpress.example.com',
        wpProtocol: 'https',
        wpHomeUrl: 'https://custom-home.example.com',
        wpSiteUrl: 'https://custom-site.example.com/wp',
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      withWCR(nextConfig, wpConfig, options);

      const writtenConfig = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('wp-instances.js')
      )?.[1];

      if (writtenConfig) {
        expect(writtenConfig).toContain('custom-home.example.com');
        expect(writtenConfig).toContain('custom-site.example.com/wp');
      }
    });
  });

  describe('multi-instance configuration', () => {
    it('should accept multi-instance WordPress configuration', () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        main: {
          wpDomain: 'main.example.com',
          wpProtocol: 'https',
        },
        shop: {
          wpDomain: 'shop.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      expect(result).toBeDefined();
    });

    it('should normalize all instances in multi-instance config', () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        main: {
          wpDomain: 'main.example.com',
          wpProtocol: 'https',
        },
        shop: {
          wpDomain: 'shop.example.com',
          wpProtocol: 'http',
          wpHomeUrl: 'http://custom-shop.example.com',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      withWCR(nextConfig, wpConfig, options);

      const writtenConfig = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('wp-instances.js')
      )?.[1];

      if (writtenConfig) {
        expect(writtenConfig).toContain('main.example.com');
        expect(writtenConfig).toContain('custom-shop.example.com');
      }
    });

    it('should generate redirects for each instance', async () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        main: {
          wpDomain: 'main.example.com',
          wpProtocol: 'https',
        },
        shop: {
          wpDomain: 'shop.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      const redirects = await result.redirects?.();

      expect(redirects).toBeDefined();
      expect(Array.isArray(redirects)).toBe(true);

      // Should have 2 redirects per instance (wc-ajax and wp-ajax)
      expect(redirects?.length).toBe(4);

      // Check main instance redirects
      const mainWcRedirect = redirects?.find(
        r => r.source === '/main' && r.destination === '/atx/main/wc'
      );
      expect(mainWcRedirect).toBeDefined();

      const mainWpRedirect = redirects?.find(
        r => r.source === '/main' && r.destination === '/atx/main/wp'
      );
      expect(mainWpRedirect).toBeDefined();

      // Check shop instance redirects
      const shopWcRedirect = redirects?.find(
        r => r.source === '/shop' && r.destination === '/atx/shop/wc'
      );
      expect(shopWcRedirect).toBeDefined();

      const shopWpRedirect = redirects?.find(
        r => r.source === '/shop' && r.destination === '/atx/shop/wp'
      );
      expect(shopWpRedirect).toBeDefined();
    });
  });

  describe('redirect generation', () => {
    it('should generate WordPress AJAX redirects', async () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        default: {
          wpDomain: 'wordpress.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);
      const redirects = await result.redirects?.();

      const wpAjaxRedirect = redirects?.find(r =>
        r.has?.some((h: { key: string }) => h.key === 'wp-ajax')
      );

      expect(wpAjaxRedirect).toBeDefined();
      expect(wpAjaxRedirect?.destination).toBe('/atx/default/wp');
      expect(wpAjaxRedirect?.permanent).toBe(false);
    });

    it('should generate WooCommerce AJAX redirects', async () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        default: {
          wpDomain: 'wordpress.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);
      const redirects = await result.redirects?.();

      const wcAjaxRedirect = redirects?.find(r =>
        r.has?.some((h: { key: string }) => h.key === 'wc-ajax')
      );

      expect(wcAjaxRedirect).toBeDefined();
      expect(wcAjaxRedirect?.destination).toBe('/atx/default/wc');
      expect(wcAjaxRedirect?.permanent).toBe(false);
    });

    it('should merge with existing redirects', async () => {
      const existingRedirects = [
        {
          source: '/old-path',
          destination: '/new-path',
          permanent: true,
        },
      ];

      const nextConfig: NextConfig = {
        redirects: async () => existingRedirects,
      };

      const wpConfig = {
        default: {
          wpDomain: 'wordpress.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);
      const redirects = await result.redirects?.();

      expect(redirects).toBeDefined();
      // Should have existing redirect + 2 WordPress redirects
      expect(redirects?.length).toBe(3);

      // Check existing redirect is preserved
      const oldRedirect = redirects?.find(r => r.source === '/old-path');
      expect(oldRedirect).toBeDefined();
    });

    it('should throw error if redirects callback returns non-array', async () => {
      const nextConfig: NextConfig = {
        redirects: async () => 'invalid' as any,
      };

      const wpConfig = {
        default: {
          wpDomain: 'wordpress.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      await expect(result.redirects?.()).rejects.toThrow(
        'Invalid return type for NextJS configuration redirects callback'
      );
    });
  });

  describe('environment variables', () => {
    it('should set frontend URL environment variable', () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        default: {
          wpDomain: 'wordpress.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'http',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      expect(result.env?.wcr_frontend_url).toBe('http://nextjs.example.com');
    });

    it('should inject instance configs into process.env (server-side only)', () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        main: {
          wpDomain: 'main.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      withWCR(nextConfig, wpConfig, options);

      // Should inject into process.env
      expect(process.env.NEXTPRESS_WP_INSTANCES).toBeDefined();
      const instances = JSON.parse(process.env.NEXTPRESS_WP_INSTANCES as string);
      expect(instances.main).toBeDefined();
      expect(instances.main.wpDomain).toBe('main.example.com');
    });

    it('should not expose instance configs in config.env (client-side)', () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {
        main: {
          wpDomain: 'main.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      // Should NOT be in config.env (client-side)
      const env = result.env as Record<string, string> | undefined;
      expect(env?.NEXTPRESS_WP_INSTANCES).toBeUndefined();
    });
  });

  describe('configuration validation', () => {
    it('should handle empty multi-instance config', () => {
      const nextConfig: NextConfig = {};
      const wpConfig = {};
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      expect(result).toBeDefined();
    });

    it('should preserve other Next.js config options', () => {
      const nextConfig: NextConfig = {
        reactStrictMode: true,
        swcMinify: true,
      };

      const wpConfig = {
        default: {
          wpDomain: 'wordpress.example.com',
          wpProtocol: 'https',
        },
      };
      const options = {
        frontendDomain: 'nextjs.example.com',
        frontendProtocol: 'https',
      };

      const result = withWCR(nextConfig, wpConfig, options);

      expect(result.reactStrictMode).toBe(true);
      expect(result.swcMinify).toBe(true);
    });
  });
});
