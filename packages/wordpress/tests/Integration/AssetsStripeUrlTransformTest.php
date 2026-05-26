<?php
/**
 * Tests the `Assets::transform_stripe_params_urls` URL → placeholder mapping
 * used by the `wc_stripe_*_params` filters in headless setups.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use NextPress\Assets;
use ReflectionMethod;
use Tests\Support\NextPressTestCase;

/**
 * Class AssetsStripeUrlTransformTest
 *
 * Asserts each WP URL shape maps to the correct proxy-route alias inside
 * the `__NEXTPRESS_ASSETS__` placeholder, and that page URLs on home_url
 * still use the `__NEXTPRESS_PROXY__` placeholder. The mapping must be
 * installation-agnostic — subdirectory installs (e.g. site_url at /wp)
 * must produce the same placeholder paths as root installs.
 */
class AssetsStripeUrlTransformTest extends NextPressTestCase
{
    /**
     * Invoke the private `transform_stripe_params_urls` method directly so
     * we can unit-test the URL-mapping logic without needing the
     * `enable_stripe_url_transforms` option + `is_graphql_request()` gates
     * around the public entry point.
     *
     * @param mixed  $value    Value passed to the transform.
     * @param string $home_url WordPress home_url.
     * @param string $site_url WordPress site_url.
     * @return mixed
     */
    private function invokeTransform($value, string $home_url, string $site_url)
    {
        $assets = new Assets();
        $method = new ReflectionMethod(Assets::class, 'transform_stripe_params_urls');
        $method->setAccessible(true);
        return $method->invoke($assets, $value, $home_url, $site_url);
    }

    /**
     * Helper: assert mapping with both root install and a /wp subdir install
     * produce the same placeholder output. Validates installation agnosticism.
     *
     * @param string $expected            Expected output placeholder URL.
     * @param string $root_install_url    WP URL on a root install.
     * @param string $subdir_install_url  WP URL on a /wp subdir install.
     */
    private function assertMapping(string $expected, string $root_install_url, string $subdir_install_url): void
    {
        $home = 'http://example.com';

        // Root install: home_url == site_url.
        $this->assertSame(
            $expected,
            $this->invokeTransform($root_install_url, $home, $home),
            'Root install mapping failed'
        );

        // Subdir install: site_url = home_url + /wp.
        $this->assertSame(
            $expected,
            $this->invokeTransform($subdir_install_url, $home, $home . '/wp'),
            'Subdirectory install mapping failed'
        );
    }

    public function testAdminAjaxMapsToWpAlias(): void
    {
        $this->assertMapping(
            'http://__NEXTPRESS_ASSETS__/wp',
            'http://example.com/wp-admin/admin-ajax.php',
            'http://example.com/wp/wp-admin/admin-ajax.php'
        );
    }

    public function testAdminAjaxPreservesQuery(): void
    {
        $this->assertMapping(
            'http://__NEXTPRESS_ASSETS__/wp?action=rest-nonce',
            'http://example.com/wp-admin/admin-ajax.php?action=rest-nonce',
            'http://example.com/wp/wp-admin/admin-ajax.php?action=rest-nonce'
        );
    }

    public function testWcAjaxMapsToWcAliasAndPreservesQuery(): void
    {
        $home = 'http://example.com';

        // wc-ajax URLs sit on home_url, not site_url, and are identified by
        // the wc-ajax= query param.
        $this->assertSame(
            'http://__NEXTPRESS_ASSETS__/wc?wc-ajax=add_to_cart',
            $this->invokeTransform('http://example.com/?wc-ajax=add_to_cart', $home, $home)
        );

        $this->assertSame(
            'http://__NEXTPRESS_ASSETS__/wc?wc-ajax=update_order_review&product_id=42',
            $this->invokeTransform(
                'http://example.com/?wc-ajax=update_order_review&product_id=42',
                $home,
                $home
            )
        );
    }

    public function testWpAdminStaticAssetRoutesThroughInternalAssets(): void
    {
        $this->assertMapping(
            'http://__NEXTPRESS_ASSETS__/wp-internal-assets/wp-admin/load-styles.php?ver=6.4',
            'http://example.com/wp-admin/load-styles.php?ver=6.4',
            'http://example.com/wp/wp-admin/load-styles.php?ver=6.4'
        );
    }

    public function testWpIncludesAssetRoutesThroughInternalAssets(): void
    {
        $this->assertMapping(
            'http://__NEXTPRESS_ASSETS__/wp-internal-assets/wp-includes/js/jquery.js',
            'http://example.com/wp-includes/js/jquery.js',
            'http://example.com/wp/wp-includes/js/jquery.js'
        );
    }

    public function testWpContentAssetRoutesThroughWpAssets(): void
    {
        // wp-content lives below home_url on both root and subdir installs.
        $this->assertMapping(
            'http://__NEXTPRESS_ASSETS__/wp-assets/wp-content/plugins/foo/script.js',
            'http://example.com/wp-content/plugins/foo/script.js',
            'http://example.com/wp/wp-content/plugins/foo/script.js'
        );
    }

    public function testWpJsonRestApiRoutesThroughWpJson(): void
    {
        $this->assertMapping(
            'http://__NEXTPRESS_ASSETS__/wp-json/wc/store/v1/cart',
            'http://example.com/wp-json/wc/store/v1/cart',
            'http://example.com/wp/wp-json/wc/store/v1/cart'
        );
    }

    public function testPageUrlOnHomeUrlUsesProxyPlaceholder(): void
    {
        // home_url-side pages (the public-facing URLs) get the
        // __NEXTPRESS_PROXY__ placeholder.
        $home = 'http://example.com';
        $this->assertSame(
            'http://__NEXTPRESS_PROXY__/checkout/',
            $this->invokeTransform('http://example.com/checkout/', $home, $home)
        );
        $this->assertSame(
            'http://__NEXTPRESS_PROXY__/my-account/orders/',
            $this->invokeTransform('http://example.com/my-account/orders/', $home, $home)
        );
    }

    public function testHeadlessSetupWithDifferentFrontendAndBackendHosts(): void
    {
        // Realistic headless config: home_url is the frontend (Next.js),
        // site_url is the WP backend. Both URLs (with their respective
        // hosts) should map correctly.
        $home = 'http://frontend.local';
        $site = 'http://backend.local/wp';

        $this->assertSame(
            'http://__NEXTPRESS_PROXY__/checkout/',
            $this->invokeTransform('http://frontend.local/checkout/', $home, $site)
        );

        $this->assertSame(
            'http://__NEXTPRESS_ASSETS__/wp',
            $this->invokeTransform('http://backend.local/wp/wp-admin/admin-ajax.php', $home, $site)
        );

        $this->assertSame(
            'http://__NEXTPRESS_ASSETS__/wp-internal-assets/wp-includes/js/jquery.js',
            $this->invokeTransform('http://backend.local/wp/wp-includes/js/jquery.js', $home, $site)
        );
    }

    public function testExternalUrlIsUnchanged(): void
    {
        // URLs on neither home_url nor site_url should pass through.
        $this->assertSame(
            'https://api.stripe.com/v1/payment_methods',
            $this->invokeTransform(
                'https://api.stripe.com/v1/payment_methods',
                'http://example.com',
                'http://example.com'
            )
        );
        $this->assertSame(
            'https://fonts.googleapis.com/css2?family=Inter',
            $this->invokeTransform(
                'https://fonts.googleapis.com/css2?family=Inter',
                'http://example.com',
                'http://example.com'
            )
        );
    }

    public function testRelativeUrlIsUnchanged(): void
    {
        // Strings without a host (relative URLs, raw values) pass through
        // unchanged; transformation is opt-in via absolute URL host match.
        $this->assertSame(
            '/?wc-ajax=%endpoint%',
            $this->invokeTransform('/?wc-ajax=%endpoint%', 'http://example.com', 'http://example.com')
        );
        $this->assertSame(
            'just a string, not a url',
            $this->invokeTransform('just a string, not a url', 'http://example.com', 'http://example.com')
        );
    }

    public function testHttpsScheme(): void
    {
        $this->assertSame(
            'https://__NEXTPRESS_ASSETS__/wp',
            $this->invokeTransform(
                'https://example.com/wp/wp-admin/admin-ajax.php',
                'https://example.com',
                'https://example.com/wp'
            )
        );
        $this->assertSame(
            'https://__NEXTPRESS_PROXY__/cart/',
            $this->invokeTransform('https://example.com/cart/', 'https://example.com', 'https://example.com')
        );
    }

    public function testArrayValuesAreRecursivelyTransformed(): void
    {
        $input = [
            'ajax_url' => 'http://example.com/wp/wp-admin/admin-ajax.php',
            'cart_url' => 'http://example.com/cart/',
            'nested'   => [
                'rest' => 'http://example.com/wp/wp-json/wc/store/v1/cart',
            ],
        ];

        $expected = [
            'ajax_url' => 'http://__NEXTPRESS_ASSETS__/wp',
            'cart_url' => 'http://__NEXTPRESS_PROXY__/cart/',
            'nested'   => [
                'rest' => 'http://__NEXTPRESS_ASSETS__/wp-json/wc/store/v1/cart',
            ],
        ];

        $this->assertSame(
            $expected,
            $this->invokeTransform($input, 'http://example.com', 'http://example.com/wp')
        );
    }

    public function testNonStringNonArrayValuesPassThrough(): void
    {
        $this->assertSame(42, $this->invokeTransform(42, 'http://example.com', 'http://example.com'));
        $this->assertSame(true, $this->invokeTransform(true, 'http://example.com', 'http://example.com'));
        $this->assertSame(null, $this->invokeTransform(null, 'http://example.com', 'http://example.com'));
    }
}
