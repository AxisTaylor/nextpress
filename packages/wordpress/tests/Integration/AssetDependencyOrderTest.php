<?php
/**
 * Tests for asset dependency ordering.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;

/**
 * Class AssetDependencyOrderTest
 *
 * Tests that scripts and stylesheets are returned in the correct order based on their dependencies.
 */
class AssetDependencyOrderTest extends NextPressTestCase
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
            'post_name' => 'dependency-order-test-post',
        ]);
    }

    /**
     * Test that scripts are returned with dependencies before dependents.
     */
    public function testScriptsReturnedInDependencyOrder(): void
    {
        // Register scripts with dependencies: base -> middle -> top
        wp_register_script('test-base-script', 'http://example.com/base.js', [], '1.0', true);
        wp_register_script('test-middle-script', 'http://example.com/middle.js', ['test-base-script'], '1.0', true);
        wp_register_script('test-top-script', 'http://example.com/top.js', ['test-middle-script'], '1.0', true);

        // Enqueue only the top-level script (should pull in dependencies)
        wp_enqueue_script('test-top-script');

        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        enqueuedScripts {
                            nodes {
                                handle
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.enqueuedScripts.nodes', self::NOT_NULL),
        ]);

        $scripts = $response['data']['assetsByUri']['enqueuedScripts']['nodes'];
        $handles = array_column($scripts, 'handle');

        // Find positions of our test scripts
        $basePos = array_search('test-base-script', $handles);
        $middlePos = array_search('test-middle-script', $handles);
        $topPos = array_search('test-top-script', $handles);

        // All scripts should be present
        $this->assertNotFalse($basePos, 'Base script should be in the list');
        $this->assertNotFalse($middlePos, 'Middle script should be in the list');
        $this->assertNotFalse($topPos, 'Top script should be in the list');

        // Dependencies should come before dependents
        $this->assertLessThan($middlePos, $basePos, 'Base script should come before middle script');
        $this->assertLessThan($topPos, $middlePos, 'Middle script should come before top script');

        // Clean up
        $this->cleanupTestScripts(['test-base-script', 'test-middle-script', 'test-top-script']);
    }

    /**
     * Test that stylesheets are returned with dependencies before dependents.
     */
    public function testStylesheetsReturnedInDependencyOrder(): void
    {
        // Register stylesheets with dependencies: base -> middle -> top
        wp_register_style('test-base-style', 'http://example.com/base.css', [], '1.0');
        wp_register_style('test-middle-style', 'http://example.com/middle.css', ['test-base-style'], '1.0');
        wp_register_style('test-top-style', 'http://example.com/top.css', ['test-middle-style'], '1.0');

        // Enqueue only the top-level stylesheet (should pull in dependencies)
        wp_enqueue_style('test-top-style');

        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        enqueuedStylesheets {
                            nodes {
                                handle
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.enqueuedStylesheets.nodes', self::NOT_NULL),
        ]);

        $stylesheets = $response['data']['assetsByUri']['enqueuedStylesheets']['nodes'];
        $handles = array_column($stylesheets, 'handle');

        // Find positions of our test stylesheets
        $basePos = array_search('test-base-style', $handles);
        $middlePos = array_search('test-middle-style', $handles);
        $topPos = array_search('test-top-style', $handles);

        // All stylesheets should be present
        $this->assertNotFalse($basePos, 'Base stylesheet should be in the list');
        $this->assertNotFalse($middlePos, 'Middle stylesheet should be in the list');
        $this->assertNotFalse($topPos, 'Top stylesheet should be in the list');

        // Dependencies should come before dependents
        $this->assertLessThan($middlePos, $basePos, 'Base stylesheet should come before middle stylesheet');
        $this->assertLessThan($topPos, $middlePos, 'Middle stylesheet should come before top stylesheet');

        // Clean up
        $this->cleanupTestStyles(['test-base-style', 'test-middle-style', 'test-top-style']);
    }

    /**
     * Test that scripts with multiple dependencies are ordered correctly.
     */
    public function testScriptsWithMultipleDependenciesOrderedCorrectly(): void
    {
        // Register scripts: dep-a and dep-b are independent, main depends on both
        wp_register_script('test-dep-a', 'http://example.com/dep-a.js', [], '1.0', true);
        wp_register_script('test-dep-b', 'http://example.com/dep-b.js', [], '1.0', true);
        wp_register_script('test-main-script', 'http://example.com/main.js', ['test-dep-a', 'test-dep-b'], '1.0', true);

        wp_enqueue_script('test-main-script');

        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        enqueuedScripts {
                            nodes {
                                handle
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.enqueuedScripts.nodes', self::NOT_NULL),
        ]);

        $scripts = $response['data']['assetsByUri']['enqueuedScripts']['nodes'];
        $handles = array_column($scripts, 'handle');

        $depAPos = array_search('test-dep-a', $handles);
        $depBPos = array_search('test-dep-b', $handles);
        $mainPos = array_search('test-main-script', $handles);

        // All scripts should be present
        $this->assertNotFalse($depAPos, 'Dependency A should be in the list');
        $this->assertNotFalse($depBPos, 'Dependency B should be in the list');
        $this->assertNotFalse($mainPos, 'Main script should be in the list');

        // Both dependencies should come before the main script
        $this->assertLessThan($mainPos, $depAPos, 'Dependency A should come before main script');
        $this->assertLessThan($mainPos, $depBPos, 'Dependency B should come before main script');

        // Clean up
        $this->cleanupTestScripts(['test-dep-a', 'test-dep-b', 'test-main-script']);
    }

    /**
     * Test that deeply nested script dependencies are ordered correctly.
     */
    public function testDeeplyNestedScriptDependenciesOrderedCorrectly(): void
    {
        // Register scripts with deep nesting: level1 -> level2 -> level3 -> level4
        wp_register_script('test-level1', 'http://example.com/level1.js', [], '1.0', true);
        wp_register_script('test-level2', 'http://example.com/level2.js', ['test-level1'], '1.0', true);
        wp_register_script('test-level3', 'http://example.com/level3.js', ['test-level2'], '1.0', true);
        wp_register_script('test-level4', 'http://example.com/level4.js', ['test-level3'], '1.0', true);

        wp_enqueue_script('test-level4');

        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        enqueuedScripts {
                            nodes {
                                handle
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.enqueuedScripts.nodes', self::NOT_NULL),
        ]);

        $scripts = $response['data']['assetsByUri']['enqueuedScripts']['nodes'];
        $handles = array_column($scripts, 'handle');

        $level1Pos = array_search('test-level1', $handles);
        $level2Pos = array_search('test-level2', $handles);
        $level3Pos = array_search('test-level3', $handles);
        $level4Pos = array_search('test-level4', $handles);

        // All scripts should be present
        $this->assertNotFalse($level1Pos, 'Level 1 script should be in the list');
        $this->assertNotFalse($level2Pos, 'Level 2 script should be in the list');
        $this->assertNotFalse($level3Pos, 'Level 3 script should be in the list');
        $this->assertNotFalse($level4Pos, 'Level 4 script should be in the list');

        // Scripts should be in order: level1 < level2 < level3 < level4
        $this->assertLessThan($level2Pos, $level1Pos, 'Level 1 should come before level 2');
        $this->assertLessThan($level3Pos, $level2Pos, 'Level 2 should come before level 3');
        $this->assertLessThan($level4Pos, $level3Pos, 'Level 3 should come before level 4');

        // Clean up
        $this->cleanupTestScripts(['test-level1', 'test-level2', 'test-level3', 'test-level4']);
    }

    /**
     * Test that EnqueuedScript dependencies field returns scripts in correct order.
     */
    public function testEnqueuedScriptDependenciesFieldReturnsCorrectOrder(): void
    {
        // Register scripts with dependencies
        wp_register_script('test-dep-first', 'http://example.com/first.js', [], '1.0', true);
        wp_register_script('test-dep-second', 'http://example.com/second.js', [], '1.0', true);
        wp_register_script('test-with-deps', 'http://example.com/with-deps.js', ['test-dep-first', 'test-dep-second'], '1.0', true);

        wp_enqueue_script('test-with-deps');

        $uri = $this->getPostUri($this->test_post);

        $response = $this->graphql([
            'query'     => '
                query GetAssetsByUri($uri: String!) {
                    assetsByUri(uri: $uri) {
                        enqueuedScripts {
                            nodes {
                                handle
                                dependencies {
                                    handle
                                }
                            }
                        }
                    }
                }
            ',
            'variables' => ['uri' => $uri],
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('assetsByUri.enqueuedScripts.nodes', self::NOT_NULL),
        ]);

        $scripts = $response['data']['assetsByUri']['enqueuedScripts']['nodes'];

        // Find the script with dependencies
        $scriptWithDeps = null;
        foreach ($scripts as $script) {
            if ($script['handle'] === 'test-with-deps') {
                $scriptWithDeps = $script;
                break;
            }
        }

        $this->assertNotNull($scriptWithDeps, 'Script with dependencies should be found');
        $this->assertNotEmpty($scriptWithDeps['dependencies'], 'Script should have dependencies');

        $depHandles = array_column($scriptWithDeps['dependencies'], 'handle');
        $this->assertContains('test-dep-first', $depHandles, 'First dependency should be listed');
        $this->assertContains('test-dep-second', $depHandles, 'Second dependency should be listed');

        // Clean up
        $this->cleanupTestScripts(['test-dep-first', 'test-dep-second', 'test-with-deps']);
    }
}
