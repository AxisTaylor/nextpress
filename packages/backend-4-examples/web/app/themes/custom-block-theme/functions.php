<?php
/**
 * Custom Block Theme functions and definitions
 *
 * @package Custom_Block_Theme
 * @since 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sets up theme defaults and registers support for various WordPress features.
 */
function custom_block_theme_setup() {
	add_theme_support( 'editor-styles' );
	add_editor_style( 'editor.css' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'custom-line-height' );
	add_theme_support( 'custom-spacing' );
	add_theme_support( 'custom-units' );
	add_theme_support( 'appearance-tools' );

	register_nav_menus(
		array(
			'primary' => esc_html__( 'Primary menu', 'custom-block-theme' ),
			'footer'  => esc_html__( 'Secondary menu', 'custom-block-theme' ),
		)
	);
}
add_action( 'after_setup_theme', 'custom_block_theme_setup' );

/**
 * Enqueue theme stylesheets.
 */
function custom_block_theme_styles() {
	wp_register_style(
		'custom-block-theme-style',
		get_stylesheet_uri(),
		array(),
		wp_get_theme()->get( 'Version' )
	);
	wp_enqueue_style( 'custom-block-theme-style' );

	// Add inline CSS after the theme stylesheet for e2e testing
	// of inline style rendering in the headless frontend.
	wp_add_inline_style(
		'custom-block-theme-style',
		'.nextpress-inline-test { --inline-test: passed; color: green; }'
	);
}
add_action( 'wp_enqueue_scripts', 'custom_block_theme_styles' );
