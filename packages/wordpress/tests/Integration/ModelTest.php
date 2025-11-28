<?php
/**
 * Tests for the NextPress Uri_Assets Model class.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;
use NextPress\Uri_Assets\Model;

/**
 * Class ModelTest
 *
 * Tests the Model class functionality for loading assets by URI.
 */
class ModelTest extends NextPressTestCase
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
            'post_name' => 'model-test-post',
        ]);
    }

    /**
     * Test that Model can be instantiated with a valid URI.
     */
    public function testModelInstantiationWithValidUri(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $model = new Model($uri);

        $this->assertInstanceOf(Model::class, $model);
    }

    /**
     * Test that Model returns the correct URI.
     */
    public function testModelReturnsCorrectUri(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $model = new Model($uri);

        $this->assertEquals($uri, $model->uri);
    }

    /**
     * Test that Model generates a valid global ID.
     */
    public function testModelGeneratesGlobalId(): void
    {
        $uri = $this->getPostUri($this->test_post);

        $model = new Model($uri);

        $this->assertNotEmpty($model->id);
        $this->assertIsString($model->id);
    }

    /**
     * Test that get_script_location returns header (0) for scripts without group.
     */
    public function testGetScriptLocationReturnsHeaderByDefault(): void
    {
        $this->registerTestScript('test-header-script', 'http://example.com/test.js', [], false);

        $script = wp_scripts()->registered['test-header-script'];
        $location = Model::get_script_location($script);

        $this->assertEquals(0, $location);

        $this->cleanupTestScripts(['test-header-script']);
    }

    /**
     * Test that get_script_location returns footer (1) for footer scripts.
     */
    public function testGetScriptLocationReturnsFooterForFooterScripts(): void
    {
        $this->registerTestScript('test-footer-script', 'http://example.com/test.js', [], true);

        $script = wp_scripts()->registered['test-footer-script'];
        $location = Model::get_script_location($script);

        $this->assertEquals(1, $location);

        $this->cleanupTestScripts(['test-footer-script']);
    }

    /**
     * Test that resolve_enqueued_assets returns correct scripts.
     */
    public function testResolveEnqueuedAssetsForScripts(): void
    {
        $this->registerTestScript('test-script-1', 'http://example.com/test1.js');
        $this->registerTestScript('test-script-2', 'http://example.com/test2.js');

        $handles = ['test-script-1', 'test-script-2'];
        $resolved = Model::resolve_enqueued_assets('script', $handles);

        $this->assertCount(2, $resolved);
        $this->assertArrayHasKey('test-script-1', $resolved);
        $this->assertArrayHasKey('test-script-2', $resolved);

        $this->cleanupTestScripts(['test-script-1', 'test-script-2']);
    }

    /**
     * Test that resolve_enqueued_assets returns correct styles.
     */
    public function testResolveEnqueuedAssetsForStyles(): void
    {
        $this->registerTestStyle('test-style-1', 'http://example.com/test1.css');
        $this->registerTestStyle('test-style-2', 'http://example.com/test2.css');

        $handles = ['test-style-1', 'test-style-2'];
        $resolved = Model::resolve_enqueued_assets('style', $handles);

        $this->assertCount(2, $resolved);
        $this->assertArrayHasKey('test-style-1', $resolved);
        $this->assertArrayHasKey('test-style-2', $resolved);

        $this->cleanupTestStyles(['test-style-1', 'test-style-2']);
    }

    /**
     * Test that resolve_enqueued_assets throws error for invalid type.
     */
    public function testResolveEnqueuedAssetsThrowsForInvalidType(): void
    {
        $this->expectException(\GraphQL\Error\UserError::class);

        Model::resolve_enqueued_assets('invalid', ['test']);
    }

    /**
     * Test that Model throws UserError for non-existent URI.
     */
    public function testModelThrowsForNonexistentUri(): void
    {
        $this->expectException(\GraphQL\Error\UserError::class);

        new Model('/nonexistent-page-that-does-not-exist/');
    }
}
