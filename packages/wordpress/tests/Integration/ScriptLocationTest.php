<?php
/**
 * Tests for the ScriptLoadingGroupEnum and location field.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;

/**
 * Class ScriptLocationTest
 *
 * Tests the script location enum and field functionality.
 */
class ScriptLocationTest extends NextPressTestCase
{
    /**
     * Test that ScriptLoadingGroupEnum is registered.
     */
    public function testScriptLoadingGroupEnumIsRegistered(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    __type(name: "ScriptLoadingGroupEnum") {
                        name
                        enumValues {
                            name
                        }
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('__type.name', 'ScriptLoadingGroupEnum'),
        ]);

        $enumValues = array_column($response['data']['__type']['enumValues'], 'name');
        $this->assertContains('HEADER', $enumValues);
        $this->assertContains('FOOTER', $enumValues);
    }

    /**
     * Test that EnqueuedScript has location field.
     */
    public function testEnqueuedScriptHasLocationField(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    __type(name: "EnqueuedScript") {
                        fields {
                            name
                            type {
                                name
                            }
                        }
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('__type.fields', self::NOT_NULL),
        ]);

        $fields = $response['data']['__type']['fields'];
        $fieldNames = array_column($fields, 'name');

        $this->assertContains('location', $fieldNames);
    }

    /**
     * Test that EnqueuedAsset has group field.
     */
    public function testEnqueuedAssetHasGroupField(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    __type(name: "EnqueuedAsset") {
                        fields {
                            name
                        }
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('__type.fields', self::NOT_NULL),
        ]);

        $fields = $response['data']['__type']['fields'];
        $fieldNames = array_column($fields, 'name');

        $this->assertContains('group', $fieldNames);
    }

    /**
     * Test that UriAssets type is registered with proper structure.
     */
    public function testUriAssetsTypeIsRegistered(): void
    {
        $response = $this->graphql([
            'query' => '
                query {
                    __type(name: "UriAssets") {
                        name
                        kind
                        fields {
                            name
                        }
                    }
                }
            ',
        ]);

        $this->assertQuerySuccessful($response, [
            $this->expectedField('__type.name', 'UriAssets'),
            $this->expectedField('__type.kind', 'OBJECT'),
        ]);

        $fields = $response['data']['__type']['fields'];
        $fieldNames = array_column($fields, 'name');

        $this->assertContains('id', $fieldNames);
        $this->assertContains('uri', $fieldNames);
        $this->assertContains('enqueuedScripts', $fieldNames);
        $this->assertContains('enqueuedStylesheets', $fieldNames);
    }
}
