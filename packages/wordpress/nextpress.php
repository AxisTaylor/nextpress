<?php
/**
 * Plugin Name: NextPress
 * Plugin URI: https://github.com/axistaylor/nextpress
 * Description: Render WordPress Gutenberg content 1:1 in Next.js. Extends WPGraphQL with enqueued asset queries for headless WordPress implementations.
 * Version: 1.0.1
 * Author: AxisTaylor
 * Author URI: https://axistaylor.com
 * Text Domain: nextpress
 * License: GPL-3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * WPGraphQL requires at least: 1.27.0
 *
 * @package     NextPress
 * @author      AxisTaylor <support@axistaylor.com>
 * @license     GPL-3
 *
 * @copyright   Copyright (c) 2024-2025 AxisTaylor, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

namespace NextPress;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Setups WPGraphQL for WooCommerce constants
 *
 * @return void
 */
function constants() {
	// Plugin version.
	if ( ! defined( 'NEXTPRESS_VERSION' ) ) {
		define( 'NEXTPRESS_VERSION', '1.0.1' );
	}
	// Plugin Folder Path.
	if ( ! defined( 'NEXTPRESS_PLUGIN_DIR' ) ) {
		define( 'NEXTPRESS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
	}
	// Plugin Folder URL.
	if ( ! defined( 'NEXTPRESS_PLUGIN_URL' ) ) {
		define( 'NEXTPRESS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
	}
	// Plugin Root File.
	if ( ! defined( 'NEXTPRESS_PLUGIN_FILE' ) ) {
		define( 'NEXTPRESS_PLUGIN_FILE', __FILE__ );
	}
	// Whether to autoload the files or not.
	if ( ! defined( 'NEXTPRESS_AUTOLOAD' ) ) {
		define( 'NEXTPRESS_AUTOLOAD', true );
	}
}

/**
 * Returns path to plugin root directory.
 *
 * @return string
 */
function get_plugin_directory() {
	return trailingslashit( NEXTPRESS_PLUGIN_DIR );
}

/**
 * Returns path to plugin "includes" directory.
 *
 * @return string
 */
function get_includes_directory() {
	return trailingslashit( NEXTPRESS_PLUGIN_DIR ) . 'includes/';
}

/**
 * Returns url to a plugin file.
 *
 * @param string $filepath  Relative path to plugin file.
 *
 * @return string
 */
function plugin_file_url( $filepath ) {
	return plugins_url( $filepath, __FILE__ );
}

/**
 * Load early includes (don't depend on WPGraphQL)
 *
 * @return void
 */
function load_early_includes() {
    $include_directory_path = get_includes_directory();

    // Load access functions
    require_once trailingslashit( NEXTPRESS_PLUGIN_DIR ) . 'access-functions.php';

    // Load settings classes
    require_once $include_directory_path . 'class-settings-registry.php';
    require_once $include_directory_path . 'class-settings.php';

    // Load CORS class
    require_once $include_directory_path . 'class-cors.php';

    // Load Assets management class
    require_once $include_directory_path . 'class-assets.php';
}

/**
 * Load WPGraphQL-dependent includes
 *
 * @return void
 */
function load_graphql_includes() {
    $include_directory_path = get_includes_directory();

    // Load WPGraphQL integration classes
    require_once $include_directory_path . 'class-model.php';
    require_once $include_directory_path . 'class-dataloader.php';
    require_once $include_directory_path . 'class-schema.php';
}

// Define constants first
constants();

// Load early includes immediately (settings, CORS, etc.)
load_early_includes();

/**
 * Initialize WPGraphQL functionality
 *
 * @return void
 */
function init_graphql() {
    // Load WPGraphQL-dependent includes
    load_graphql_includes();

    // Initialize WPGraphQL integrations
    add_filter(
        'graphql_data_loader_classes',
        function( $loaders ) {
            $loaders['uri_assets'] = Uri_Assets\DataLoader::class;

            return $loaders;
        },
        10,
        2
    );
    new Uri_Assets\Schema();
}
add_action( 'graphql_init', __NAMESPACE__ . '\init_graphql' );

/**
 * Initialize admin functionality
 *
 * @return void
 */
function init_admin() {
    // Initialize settings page
    $settings = new Settings();
    $settings->init();
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\init_admin' );

/**
 * Initialize CORS functionality
 *
 * @return void
 */
function init_cors() {
    new CORS();
}
add_action( 'plugins_loaded', __NAMESPACE__ . '\init_cors' );

/**
 * Initialize Assets management functionality
 *
 * @return void
 */
function init_assets() {
    new Assets();
}
add_action( 'plugins_loaded', __NAMESPACE__ . '\init_assets' );

function check_dependencies() {
    if ( class_exists( '\WPGraphQL' ) ) {
        return;
    }

    add_action(
        'admin_notices',
        static function ()  {
            ?>
            <div class="error notice">
                <p>
                    <?php esc_html__( 'WPGraphQL must be active for "NextPress" to work', 'nextpress' ); ?>
                </p>
            </div>
            <?php
        }
    );
}

add_action( 'plugins_loaded', __NAMESPACE__ . '\check_dependencies' );

// Load constants.
constants();