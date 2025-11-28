<?php
/**
 * Integration suite bootstrap file.
 *
 * This file is loaded AFTER the suite modules are initialized, WordPress, plugins and themes are loaded.
 *
 * @package NextPress\Tests\Integration
 */

// Define test mode constant
if ( ! defined( 'NEXTPRESS_TEST_MODE' ) ) {
    define( 'NEXTPRESS_TEST_MODE', true );
}

// Enable GraphQL debugging
if ( ! defined( 'GRAPHQL_DEBUG' ) ) {
    define( 'GRAPHQL_DEBUG', true );
}