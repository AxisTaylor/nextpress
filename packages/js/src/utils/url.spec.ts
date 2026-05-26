import { extractPath, isInternalRoute, isExternalScript, isScriptForAnotherInstance, resolveAssetHref, transformAssetUrl } from './url';

describe('extractPath', () => {
  it('should extract pathname from a full URL', () => {
    expect(extractPath('http://example.com/wp-includes/js/test.js')).toBe('/wp-includes/js/test.js');
  });

  it('should return the input if URL parsing fails', () => {
    expect(extractPath('/already/a/path')).toBe('/already/a/path');
  });

  it('should strip query string and hash', () => {
    expect(extractPath('http://example.com/file.js?ver=1.0#section')).toBe('/file.js');
  });

  it('should extract pathname from a protocol-relative URL', () => {
    expect(extractPath('//wordpress.local/app/plugins/sub/assets/css/checkout.css'))
      .toBe('/app/plugins/sub/assets/css/checkout.css');
  });
});

describe('isInternalRoute', () => {
  it('should match wp-includes paths', () => {
    expect(isInternalRoute.test('/wp-includes/js/jquery.js')).toBe(true);
  });

  it('should match wp-admin paths', () => {
    expect(isInternalRoute.test('/wp-admin/admin-ajax.php')).toBe(true);
  });

  it('should not match plugin paths', () => {
    expect(isInternalRoute.test('/app/plugins/my-plugin/script.js')).toBe(false);
  });

  it('should not match theme paths', () => {
    expect(isInternalRoute.test('/app/themes/my-theme/style.css')).toBe(false);
  });
});

describe('isExternalScript', () => {
  it('should return true for different origins', () => {
    expect(isExternalScript('https://cdn.example.com/script.js', ['http://wordpress.local'])).toBe(true);
  });

  it('should return false for same origin', () => {
    expect(isExternalScript('http://wordpress.local/app/plugins/test.js', ['http://wordpress.local'])).toBe(false);
  });

  it('should return false when script matches any instance URL', () => {
    expect(isExternalScript(
      'http://other-site.local/app/plugins/test.js',
      ['http://wordpress.local', 'http://other-site.local']
    )).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isExternalScript('/relative/path.js', ['http://wordpress.local'])).toBe(false);
  });

  it('should return false for a protocol-relative URL whose host matches the backend', () => {
    expect(isExternalScript('//wordpress.local/app/plugins/test.js', ['http://wordpress.local'])).toBe(false);
  });

  it('should ignore scheme when matching backend host (http asset on https backend)', () => {
    expect(isExternalScript('http://wordpress.local/app/plugins/test.js', ['https://wordpress.local'])).toBe(false);
  });
});

describe('isScriptForAnotherInstance', () => {
  it('should return the instance slug when script matches', () => {
    expect(isScriptForAnotherInstance(
      'http://other-site.local/app/plugins/test.js',
      { shop: 'http://other-site.local' }
    )).toBe('shop');
  });

  it('should return false when no instance matches', () => {
    expect(isScriptForAnotherInstance(
      'https://cdn.example.com/script.js',
      { shop: 'http://other-site.local' }
    )).toBe(false);
  });

  it('should return false for relative paths', () => {
    expect(isScriptForAnotherInstance(
      '/relative/path.js',
      { shop: 'http://other-site.local' }
    )).toBe(false);
  });

  it('should match a protocol-relative URL against a known instance', () => {
    expect(isScriptForAnotherInstance(
      '//other-site.local/app/plugins/test.js',
      { shop: 'http://other-site.local' }
    )).toBe('shop');
  });
});

describe('transformAssetUrl', () => {
  it('should route wp-includes to wp-internal-assets', () => {
    expect(transformAssetUrl('http://example.com/wp-includes/js/jquery.js', 'default'))
      .toBe('/atx/default/wp-internal-assets/wp-includes/js/jquery.js');
  });

  it('should route wp-admin to wp-internal-assets', () => {
    expect(transformAssetUrl('http://example.com/wp-admin/admin-ajax.php', 'default'))
      .toBe('/atx/default/wp-internal-assets/wp-admin/admin-ajax.php');
  });

  it('should route plugin paths to wp-assets', () => {
    expect(transformAssetUrl('http://example.com/app/plugins/my-plugin/script.js', 'default'))
      .toBe('/atx/default/wp-assets/app/plugins/my-plugin/script.js');
  });

  it('should route theme paths to wp-assets', () => {
    expect(transformAssetUrl('http://example.com/app/themes/my-theme/style.css', 'default'))
      .toBe('/atx/default/wp-assets/app/themes/my-theme/style.css');
  });

  it('should use the specified instance', () => {
    expect(transformAssetUrl('http://example.com/wp-includes/js/test.js', 'demo'))
      .toBe('/atx/demo/wp-internal-assets/wp-includes/js/test.js');
  });

  it('should handle relative paths', () => {
    expect(transformAssetUrl('/wp-includes/js/test.js', 'default'))
      .toBe('/atx/default/wp-internal-assets/wp-includes/js/test.js');
  });

  it('should strip the host from a protocol-relative URL', () => {
    expect(transformAssetUrl('//wordpress.local/app/plugins/woocommerce-subscriptions/assets/css/checkout.css', 'shop'))
      .toBe('/atx/shop/wp-assets/app/plugins/woocommerce-subscriptions/assets/css/checkout.css');
  });
});

describe('resolveAssetHref', () => {
  const wpHomeUrl = 'http://wordpress.local';

  it('should proxy a same-host URL through the current instance', () => {
    expect(resolveAssetHref(
      'http://wordpress.local/app/plugins/my-plugin/script.js',
      'shop',
      wpHomeUrl,
      {},
    )).toBe('/atx/shop/wp-assets/app/plugins/my-plugin/script.js');
  });

  it('should return external URLs unchanged with query string preserved', () => {
    const googleFonts = 'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;600;800&display=swap';
    expect(resolveAssetHref(googleFonts, 'shop', wpHomeUrl, {})).toBe(googleFonts);
  });

  it('should route foreign-instance URLs through the matching instance proxy', () => {
    expect(resolveAssetHref(
      'http://other-site.local/app/plugins/my-plugin/script.js',
      'shop',
      wpHomeUrl,
      { marketing: 'http://other-site.local' },
    )).toBe('/atx/marketing/wp-assets/app/plugins/my-plugin/script.js');
  });

  it('should resolve a protocol-relative same-host URL via the current instance proxy', () => {
    expect(resolveAssetHref(
      '//wordpress.local/app/plugins/woocommerce-subscriptions/assets/css/checkout.css',
      'shop',
      wpHomeUrl,
      {},
    )).toBe('/atx/shop/wp-assets/app/plugins/woocommerce-subscriptions/assets/css/checkout.css');
  });

  it('should match host regardless of scheme (http asset on https backend)', () => {
    expect(resolveAssetHref(
      'http://wordpress.local/app/plugins/my-plugin/script.js',
      'shop',
      'https://wordpress.local',
      {},
    )).toBe('/atx/shop/wp-assets/app/plugins/my-plugin/script.js');
  });
});
