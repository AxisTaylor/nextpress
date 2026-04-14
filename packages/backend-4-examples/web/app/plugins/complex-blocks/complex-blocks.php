<?php
/**
 * Plugin Name: Complex Blocks
 * Description: Test blocks for NextPress e2e testing — exercises viewScriptModule, @wordpress/interactivity, deferred classic scripts, and session-based WC actions.
 * Version: 1.0.0
 * Author: AxisTaylor, LLC
 * Requires at least: 6.5
 * Requires PHP: 8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register all blocks from the dist directory.
 */
add_action( 'init', function () {
	$blocks = [
		'interactive-counter',
		'interactive-toggle',
		'deferred-view',
		'session-add-to-cart',
		'session-customer-note',
	];

	foreach ( $blocks as $block ) {
		$block_path = __DIR__ . '/dist/' . $block;
		if ( is_dir( $block_path ) ) {
			register_block_type( $block_path );
		}
	}
} );
