import { replaceProxyPlaceholders } from './woocommerce';

describe('replaceProxyPlaceholders', () => {
  const ORIGINAL_FRONTEND_URL = process.env.wcr_frontend_url;

  beforeEach(() => {
    process.env.wcr_frontend_url = 'http://localhost:3000';
  });

  afterAll(() => {
    if (ORIGINAL_FRONTEND_URL === undefined) {
      delete process.env.wcr_frontend_url;
    } else {
      process.env.wcr_frontend_url = ORIGINAL_FRONTEND_URL;
    }
  });

  describe('empty / unchanged inputs', () => {
    it('returns empty content unchanged', () => {
      expect(replaceProxyPlaceholders('', 'default')).toBe('');
    });

    it('returns content with no placeholders unchanged', () => {
      const input = 'var foo = { bar: "baz" };';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(input);
    });
  });

  describe('__NEXTPRESS_PROXY__ replacement', () => {
    it('replaces the placeholder with frontend origin (unescaped slashes)', () => {
      const input = 'var url = "http://__NEXTPRESS_PROXY__/checkout/";';
      const expected = 'var url = "http://localhost:3000/checkout/";';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });

    it('replaces the placeholder with frontend origin (JSON-escaped slashes)', () => {
      const input = '{"url":"http:\\/\\/__NEXTPRESS_PROXY__\\/checkout\\/"}';
      const expected = '{"url":"http:\\/\\/localhost:3000\\/checkout\\/"}';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });

    it('does NOT inject the current page pathname into the frontend origin', () => {
      // Regression test: previously frontendOrigin was `${url}/${pathname}`,
      // producing URLs like `http://localhost:3000//account/checkout/`.
      const input = 'var url = "http://__NEXTPRESS_PROXY__/checkout/";';
      const result = replaceProxyPlaceholders(input, 'default', '/account/add-payment-method');
      expect(result).toBe('var url = "http://localhost:3000/checkout/";');
      expect(result).not.toContain('//account');
      expect(result).not.toContain('/add-payment-method/checkout');
    });

    it('handles multiple occurrences in one string', () => {
      const input = 'a=http://__NEXTPRESS_PROXY__/cart/; b=http://__NEXTPRESS_PROXY__/checkout/;';
      const expected = 'a=http://localhost:3000/cart/; b=http://localhost:3000/checkout/;';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });

    it('matches https placeholder and substitutes frontend origin scheme', () => {
      // The regex matches both http:// and https:// placeholders, but the
      // substitution uses the scheme of `wcr_frontend_url`. Behavior is
      // intentional: callers should set wcr_frontend_url to whichever
      // scheme the frontend serves on.
      const input = 'var url = "https://__NEXTPRESS_PROXY__/checkout/";';
      expect(replaceProxyPlaceholders(input, 'default')).toBe('var url = "http://localhost:3000/checkout/";');
      process.env.wcr_frontend_url = 'https://example.com';
      expect(replaceProxyPlaceholders(input, 'default')).toBe('var url = "https://example.com/checkout/";');
    });

    it('falls back to empty origin when wcr_frontend_url is unset', () => {
      delete process.env.wcr_frontend_url;
      const input = 'var url = "http://__NEXTPRESS_PROXY__/checkout/";';
      expect(replaceProxyPlaceholders(input, 'default')).toBe('var url = "/checkout/";');
    });

    it('ignores the deprecated pathname argument (does not affect output)', () => {
      const input = 'var url = "http://__NEXTPRESS_PROXY__/cart/";';
      const without = replaceProxyPlaceholders(input, 'default');
      const withSlash = replaceProxyPlaceholders(input, 'default', '/some-page');
      const withoutSlash = replaceProxyPlaceholders(input, 'default', 'some-page');
      expect(without).toBe(withSlash);
      expect(without).toBe(withoutSlash);
    });
  });

  describe('__NEXTPRESS_ASSETS__ replacement', () => {
    it('replaces the placeholder with /atx/<instance> (unescaped slashes)', () => {
      const input = 'var url = "http://__NEXTPRESS_ASSETS__/wp-content/plugins/foo.js";';
      const expected = 'var url = "/atx/default/wp-content/plugins/foo.js";';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });

    it('replaces the placeholder with /atx/<instance> (JSON-escaped slashes)', () => {
      const input = '{"src":"http:\\/\\/__NEXTPRESS_ASSETS__\\/wp-content\\/plugins\\/foo.js"}';
      const expected = '{"src":"\\/atx\\/default\\/wp-content\\/plugins\\/foo.js"}';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });

    it('preserves the path that follows the placeholder', () => {
      // Path-based routing is determined by the PHP layer (which writes
      // the placeholder with the right proxy-route alias path baked in,
      // e.g. /wp, /wc, /wp-internal-assets/..., /wp-assets/...). The TS
      // replacement must not alter that path.
      const cases = [
        ['http://__NEXTPRESS_ASSETS__/wp', '/atx/shop/wp'],
        ['http://__NEXTPRESS_ASSETS__/wc?wc-ajax=add_to_cart', '/atx/shop/wc?wc-ajax=add_to_cart'],
        ['http://__NEXTPRESS_ASSETS__/wp-internal-assets/wp-admin/load-styles.php?ver=1', '/atx/shop/wp-internal-assets/wp-admin/load-styles.php?ver=1'],
        ['http://__NEXTPRESS_ASSETS__/wp-assets/wp-content/plugins/foo.js', '/atx/shop/wp-assets/wp-content/plugins/foo.js'],
        ['http://__NEXTPRESS_ASSETS__/wp-json/wc/store/v1/cart', '/atx/shop/wp-json/wc/store/v1/cart'],
      ];
      for (const [input, expected] of cases) {
        expect(replaceProxyPlaceholders(input, 'shop')).toBe(expected);
      }
    });

    it('uses the supplied instance slug', () => {
      const input = 'var url = "http://__NEXTPRESS_ASSETS__/wp";';
      expect(replaceProxyPlaceholders(input, 'shop')).toBe('var url = "/atx/shop/wp";');
      expect(replaceProxyPlaceholders(input, 'marketing')).toBe('var url = "/atx/marketing/wp";');
    });

    it('handles multiple occurrences in one string', () => {
      const input = 'a=http://__NEXTPRESS_ASSETS__/wp; b=http://__NEXTPRESS_ASSETS__/wc?wc-ajax=foo;';
      const expected = 'a=/atx/default/wp; b=/atx/default/wc?wc-ajax=foo;';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });
  });

  describe('mixed placeholders', () => {
    it('handles both placeholder types in the same string', () => {
      const input = 'page="http://__NEXTPRESS_PROXY__/checkout/"; ajax="http://__NEXTPRESS_ASSETS__/wp";';
      const expected = 'page="http://localhost:3000/checkout/"; ajax="/atx/default/wp";';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });

    it('handles mixed escaped + unescaped forms', () => {
      const input = 'a=http://__NEXTPRESS_PROXY__/cart/; b="http:\\/\\/__NEXTPRESS_PROXY__\\/checkout\\/"';
      const expected = 'a=http://localhost:3000/cart/; b="http:\\/\\/localhost:3000\\/checkout\\/"';
      expect(replaceProxyPlaceholders(input, 'default')).toBe(expected);
    });
  });
});
