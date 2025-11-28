<?php
/**
 * Tests for the NextPress Uri_Assets DataLoader class.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;
use NextPress\Uri_Assets\DataLoader;
use NextPress\Uri_Assets\Model;

/**
 * Class DataLoaderTest
 *
 * Tests the DataLoader class functionality.
 */
class DataLoaderTest extends NextPressTestCase
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
            'post_name' => 'dataloader-test-post',
        ]);
    }

    /**
     * Test that DataLoader is registered with WPGraphQL.
     */
    public function testDataLoaderIsRegistered(): void
    {
        $context = \WPGraphQL::get_app_context();
        $loader = $context->get_loader('uri_assets');

        $this->assertInstanceOf(DataLoader::class, $loader);
    }

    /**
     * Test that DataLoader loads Model for valid URI.
     */
    public function testDataLoaderLoadsModelForValidUri(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $context = \WPGraphQL::get_app_context();
        $loader = $context->get_loader('uri_assets');
        $result = $loader->load($uri);

        $this->assertInstanceOf(Model::class, $result);
    }

    /**
     * Test that DataLoader can load multiple URIs via GraphQL queries.
     */
    public function testDataLoaderCanLoadMultipleUrisViaGraphQL(): void
    {
        $post1 = $this->createTestPost(['post_name' => 'dataloader-test-post-1']);
        $post2 = $this->createTestPost(['post_name' => 'dataloader-test-post-2']);

        $uri1 = $this->getPostUri($post1);
        $uri2 = $this->getPostUri($post2);

        // Query both URIs
        $response1 = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        uri
                    }
                }
            ',
            'variables' => ['uri' => $uri1],
        ]);

        $response2 = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        uri
                    }
                }
            ',
            'variables' => ['uri' => $uri2],
        ]);

        $this->assertQuerySuccessful($response1, [
            $this->expectedField('assetsByUri.uri', $uri1),
        ]);

        $this->assertQuerySuccessful($response2, [
            $this->expectedField('assetsByUri.uri', $uri2),
        ]);
    }

    /**
     * Test that assetsByUri query uses the DataLoader.
     */
    public function testAssetsByUriQueryUsesDataLoader(): void
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
            $this->expectedField('assetsByUri.uri', $uri),
        ]);
    }
}
