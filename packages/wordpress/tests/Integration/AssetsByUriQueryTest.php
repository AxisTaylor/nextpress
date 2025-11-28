<?php
/**
 * Tests for the assetsByUri GraphQL query.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;

/**
 * Class AssetsByUriQueryTest
 *
 * Tests the assetsByUri GraphQL query functionality.
 */
class AssetsByUriQueryTest extends NextPressTestCase
{
    /**
     * Test post for URI resolution.
     *
     * @var \WP_Post
     */
    private $test_post;

    /**
     * Set up test fixtures.
     */
    public function setUp(): void
    {
        parent::setUp();

        $this->test_post = $this->createTestPost([
            'post_name' => 'assets-query-test-post',
        ]);
    }

    /**
     * Test that assetsByUri query returns expected data structure.
     */
    public function testAssetsByUriQueryReturnsExpectedStructure(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        id
                        uri
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.id', self::NOT_NULL),
            $this->expectedField('assetsByUri.uri', $uri),
        ]);
    }

    /**
     * Test that assetsByUri query can fetch enqueuedScripts connection.
     */
    public function testAssetsByUriQueryFetchesEnqueuedScripts(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        id
                        uri
                        enqueuedScripts {
                            nodes {
                                handle
                                src
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.id', self::NOT_NULL),
            $this->expectedField('assetsByUri.enqueuedScripts.nodes', self::NOT_NULL),
        ]);
    }

    /**
     * Test that assetsByUri query can fetch enqueuedStylesheets connection.
     */
    public function testAssetsByUriQueryFetchesEnqueuedStylesheets(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        id
                        uri
                        enqueuedStylesheets {
                            nodes {
                                handle
                                src
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.id', self::NOT_NULL),
            $this->expectedField('assetsByUri.enqueuedStylesheets.nodes', self::NOT_NULL),
        ]);
    }

    /**
     * Test that assetsByUri query returns error for non-existent URI.
     */
    public function testAssetsByUriQueryReturnsErrorForNonexistentUri(): void
    {
        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        id
                        uri
                    }
                }
            ',
            'variables' => ['uri' => '/nonexistent-uri-that-does-not-exist/'],
        ]);

        // Either returns an error or null data for non-existent URI
        $hasError = isset($response['errors']) && !empty($response['errors']);
        $hasNullData = isset($response['data']['assetsByUri']) && $response['data']['assetsByUri'] === null;

        $this->assertTrue($hasError || $hasNullData, 'Query should return error or null for non-existent URI');
    }

    /**
     * Test that assetsByUri query works with page URI.
     */
    public function testAssetsByUriQueryWorksWithPageUri(): void
    {
        $page = $this->createTestPage([
            'post_name' => 'assets-query-test-page',
        ]);

        // Clear schema to ensure fresh state
        $this->clearSchema();

        $uri = $this->getPostUri($page);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        id
                        uri
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.id', self::NOT_NULL),
            $this->expectedField('assetsByUri.uri', $uri),
        ]);
    }
}
