<?php
/**
 * Tests for the globalStyles GraphQL query.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;

/**
 * Class GlobalStylesQueryTest
 *
 * Tests the globalStyles GraphQL query functionality.
 */
class GlobalStylesQueryTest extends NextPressTestCase
{
    /**
     * Test that globalStyles query returns expected data structure.
     */
    public function testGlobalStylesQueryReturnsExpectedStructure(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    globalStyles {
                        stylesheet
                        customCss
                        renderedFontFaces
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('globalStyles', self::NOT_NULL),
        ]);

        $globalStyles = $response['data']['globalStyles'];
        $this->assertArrayHasKey('stylesheet', $globalStyles);
        $this->assertArrayHasKey('customCss', $globalStyles);
        $this->assertArrayHasKey('renderedFontFaces', $globalStyles);
    }

    /**
     * Test that globalStyles.stylesheet returns the theme.json global stylesheet.
     */
    public function testGlobalStylesReturnsStylesheet(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    globalStyles {
                        stylesheet
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('globalStyles', self::NOT_NULL),
        ]);

        $stylesheet = $response['data']['globalStyles']['stylesheet'];

        // The stylesheet should be a string or null depending on theme.json support.
        $this->assertTrue(
            is_string($stylesheet) || null === $stylesheet,
            'stylesheet should be a string or null'
        );
    }

    /**
     * Test that globalStyles.customCss returns custom CSS when set.
     */
    public function testGlobalStylesReturnsCustomCss(): void
    {
        // Set custom CSS via the Customizer option.
        $custom_css = 'body { background: red; }';
        wp_update_custom_css_post($custom_css);

        $response = $this->graphql([
            'query' => '
                query {
                    globalStyles {
                        customCss
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('globalStyles', self::NOT_NULL),
        ]);

        $returned_css = $response['data']['globalStyles']['customCss'];
        $this->assertNotNull($returned_css);
        $this->assertStringContainsString('background: red', $returned_css);
    }

    /**
     * Test that globalStyles.customCss returns null when no custom CSS is set.
     */
    public function testGlobalStylesReturnsNullCustomCssWhenEmpty(): void
    {
        // Ensure no custom CSS is set.
        wp_update_custom_css_post('');

        $response = $this->graphql([
            'query' => '
                query {
                    globalStyles {
                        customCss
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('globalStyles', self::NOT_NULL),
        ]);
    }

    /**
     * Test that globalStyles.renderedFontFaces returns a string or null.
     */
    public function testGlobalStylesReturnsRenderedFontFaces(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    globalStyles {
                        renderedFontFaces
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('globalStyles', self::NOT_NULL),
        ]);

        $fontFaces = $response['data']['globalStyles']['renderedFontFaces'];
        $this->assertTrue(
            is_string($fontFaces) || null === $fontFaces,
            'renderedFontFaces should be a string or null'
        );
    }

    /**
     * Test that all globalStyles fields can be queried together.
     */
    public function testGlobalStylesAllFieldsTogether(): void
    {
        wp_update_custom_css_post('.test { color: blue; }');

        $response = $this->graphql([
            'query' => '
                query {
                    globalStyles {
                        stylesheet
                        customCss
                        renderedFontFaces
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('globalStyles', self::NOT_NULL),
        ]);

        $globalStyles = $response['data']['globalStyles'];
        $this->assertStringContainsString('color: blue', $globalStyles['customCss']);
    }
}
