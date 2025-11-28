<?php
/**
 * NextPress Test Case
 *
 * Base test case for NextPress integration tests.
 * Extends WPGraphQLTestCase for GraphQL testing utilities.
 *
 * @package NextPress\Tests\Support
 */

namespace Tests\Support;

use Tests\WPGraphQL\TestCase\WPGraphQLTestCase;

/**
 * Class NextPressTestCase
 *
 * Provides common setup and helper methods for NextPress tests.
 */
class NextPressTestCase extends WPGraphQLTestCase
{
    /**
     * Set up test fixtures.
     */
    public function setUp(): void
    {
        parent::setUp();

        // Clear the WPGraphQL schema to ensure fresh state
        $this->clearSchema();
    }

    /**
     * Tear down test fixtures.
     */
    public function tearDown(): void
    {
        parent::tearDown();
    }

    /**
     * Create a test post with default values.
     *
     * @param array $args Optional arguments to override defaults.
     * @return \WP_Post
     */
    protected function createTestPost(array $args = []): \WP_Post
    {
        $defaults = [
            'post_title'   => 'Test Post',
            'post_name'    => 'test-post-' . uniqid(),
            'post_content' => '<!-- wp:paragraph --><p>Test content</p><!-- /wp:paragraph -->',
            'post_status'  => 'publish',
            'post_type'    => 'post',
        ];

        $args = wp_parse_args($args, $defaults);

        return static::factory()->post->create_and_get($args);
    }

    /**
     * Create a test page with default values.
     *
     * @param array $args Optional arguments to override defaults.
     * @return \WP_Post
     */
    protected function createTestPage(array $args = []): \WP_Post
    {
        $defaults = [
            'post_title'   => 'Test Page',
            'post_name'    => 'test-page-' . uniqid(),
            'post_content' => '<!-- wp:paragraph --><p>Test page content</p><!-- /wp:paragraph -->',
            'post_status'  => 'publish',
            'post_type'    => 'page',
        ];

        $args = wp_parse_args($args, $defaults);

        return static::factory()->post->create_and_get($args);
    }

    /**
     * Get the URI for a post.
     *
     * @param \WP_Post $post The post to get the URI for.
     * @return string
     */
    protected function getPostUri(\WP_Post $post): string
    {
        return wp_make_link_relative( get_permalink( $post ) );
    }

    /**
     * Execute a GraphQL query for assets by URI.
     *
     * @param string $uri The URI to query.
     * @param string $fields Optional fields to select (default: id, uri).
     * @return array
     */
    protected function queryAssetsByUri(string $uri, string $fields = 'id uri'): array
    {
        $query = "
            query GetAssetsByUri(\$uri: String!) {
                assetsByUri(uri: \$uri) {
                    {$fields}
                }
            }
        ";

        return $this->graphql([
            'query'     => $query,
            'variables' => ['uri' => $uri],
        ]);
    }

    /**
     * Register a test script.
     *
     * @param string $handle   Script handle.
     * @param string $src      Script source URL.
     * @param array  $deps     Dependencies.
     * @param bool   $in_footer Whether to load in footer.
     * @return void
     */
    protected function registerTestScript(
        string $handle,
        string $src = 'http://example.com/test.js',
        array $deps = [],
        bool $in_footer = false
    ): void {
        wp_register_script($handle, $src, $deps, '1.0', $in_footer);
    }

    /**
     * Register a test style.
     *
     * @param string $handle Style handle.
     * @param string $src    Style source URL.
     * @param array  $deps   Dependencies.
     * @return void
     */
    protected function registerTestStyle(
        string $handle,
        string $src = 'http://example.com/test.css',
        array $deps = []
    ): void {
        wp_register_style($handle, $src, $deps, '1.0');
    }

    /**
     * Clean up registered test scripts.
     *
     * @param array $handles Script handles to deregister.
     * @return void
     */
    protected function cleanupTestScripts(array $handles): void
    {
        foreach ($handles as $handle) {
            wp_deregister_script($handle);
        }
    }

    /**
     * Clean up registered test styles.
     *
     * @param array $handles Style handles to deregister.
     * @return void
     */
    protected function cleanupTestStyles(array $handles): void
    {
        foreach ($handles as $handle) {
            wp_deregister_style($handle);
        }
    }
}
