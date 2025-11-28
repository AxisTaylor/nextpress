<?php
/**
 * Tests for the NextPress CORS class.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;
use NextPress\CORS;

/**
 * Class CORSTest
 *
 * Tests the CORS functionality.
 */
class CORSTest extends NextPressTestCase
{
    /**
     * Test that CORS class can be instantiated.
     */
    public function testCorsCanBeInstantiated(): void
    {
        $cors = new CORS();

        $this->assertInstanceOf(CORS::class, $cors);
    }

    /**
     * Test that CORS is disabled by default.
     */
    public function testCorsIsDisabledByDefault(): void
    {
        $enabled = nextpress_get_setting('enable_cors', 'off');

        $this->assertEquals('off', $enabled);
    }

    /**
     * Test that nextpress_cors_enabled filter works.
     */
    public function testCorsEnabledFilterWorks(): void
    {
        // Add filter to enable CORS
        add_filter('nextpress_cors_enabled', '__return_true');

        $filtered = apply_filters('nextpress_cors_enabled', false);

        $this->assertTrue($filtered);

        // Clean up
        remove_filter('nextpress_cors_enabled', '__return_true');
    }

    /**
     * Test that nextpress_cors_allowed_origins filter works.
     */
    public function testCorsAllowedOriginsFilterWorks(): void
    {
        $test_origins = ['https://example.com', 'https://test.com'];

        add_filter('nextpress_cors_allowed_origins', function ($origins) use ($test_origins) {
            return array_merge($origins, $test_origins);
        });

        $filtered = apply_filters('nextpress_cors_allowed_origins', []);

        $this->assertContains('https://example.com', $filtered);
        $this->assertContains('https://test.com', $filtered);

        // Clean up
        remove_all_filters('nextpress_cors_allowed_origins');
    }

    /**
     * Test that nextpress_cors_allowed_headers filter works.
     */
    public function testCorsAllowedHeadersFilterWorks(): void
    {
        $custom_header = 'X-Custom-Header';

        add_filter('nextpress_cors_allowed_headers', function ($headers) use ($custom_header) {
            $headers[] = $custom_header;
            return $headers;
        });

        $default_headers = [
            'Accept',
            'Content-Type',
            'Authorization',
        ];

        $filtered = apply_filters('nextpress_cors_allowed_headers', $default_headers);

        $this->assertContains($custom_header, $filtered);

        // Clean up
        remove_all_filters('nextpress_cors_allowed_headers');
    }

    /**
     * Test that nextpress_cors_is_origin_allowed filter works.
     */
    public function testCorsIsOriginAllowedFilterWorks(): void
    {
        $allowed_origin = 'https://allowed-origin.com';

        add_filter('nextpress_cors_is_origin_allowed', function ($allowed, $origin) use ($allowed_origin) {
            if ($origin === $allowed_origin) {
                return true;
            }
            return $allowed;
        }, 10, 2);

        $filtered = apply_filters('nextpress_cors_is_origin_allowed', false, $allowed_origin);

        $this->assertTrue($filtered);

        // Clean up
        remove_all_filters('nextpress_cors_is_origin_allowed');
    }
}
